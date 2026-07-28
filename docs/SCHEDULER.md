# Scheduler Execution Model

This document defines the contract of WatchTower's monitoring scheduler. Every
behaviour listed here is implemented in `Backend/src/jobs/scheduler.js` and its
collaborators, and is covered by tests in `Backend/tests/`.

Before Phase 2 the scheduler was a `node-cron` tick guarded by a module-scoped
`isRunning` boolean. That is safe in exactly one process and undefined
everywhere else. What follows replaces it.

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **Tick** | One wake-up of the scheduler loop (default every 5s). |
| **Due** | A monitor whose `nextCheckAt` is at or before now. |
| **Check** | One full probe of a target, including its retry ladder. |
| **Attempt** | One single HTTP request inside a check. |
| **Leader** | The single process instance currently holding the scheduler lock. |

---

## 2. Coordination across instances — leader election

**Behaviour: exactly one instance executes checks at any time.**

The previous model had *no* cross-process coordination. Two instances (any
horizontal scale, or the overlap window of a rolling deploy) meant duplicate
HTTP checks, duplicate log rows, duplicate incidents and **duplicate alert
emails** to customers.

WatchTower uses a **MongoDB TTL-backed lease lock** (`scheduler_locks`
collection, `Backend/src/services/lock.service.js`):

- A single document with `_id: "monitor-scheduler"` holds `owner` (a per-process
  instance id) and `expiresAt`.
- Acquisition is a single atomic `findOneAndUpdate` with `upsert: true`, filtered
  on `{ _id, $or: [ { expiresAt: { $lte: now } }, { owner: <me> } ] }`. Atomicity
  comes from the unique `_id` index: two racing instances cannot both match.
- The leader **renews** the lease every tick. Renewal is the same atomic
  operation, so a leader that has already lost its lease cannot reclaim it while
  another instance holds a live one.
- Followers keep ticking and keep *trying* to acquire, so failover is automatic
  and takes at most one lease TTL.

**The TTL index is garbage collection, not correctness.** MongoDB's TTL monitor
only sweeps about once every 60 seconds, so an expired lock document can linger.
Correctness therefore comes from the `expiresAt <= now` comparison inside the
query — never from the document having been physically deleted. This distinction
matters: a design that waits for TTL deletion before re-acquiring would stall
failover for up to a minute.

Lease TTL is `SCHEDULER_LOCK_TTL_MS` (default 30s) against a 5s tick, i.e. six
renewal opportunities per lease. On graceful shutdown the leader **explicitly
releases** the lock so failover is immediate rather than TTL-bound.

**Trade-off accepted:** this is active/passive. One instance does all checking,
so scheduling does not scale horizontally — it fails over. For this workload
(hundreds of monitors, one cheap HTTP request each) a single leader is far from
saturated, and partitioned/sharded scheduling is materially more complex. See
`docs/adr/` for the sharding design we would adopt beyond that point.

---

## 3. Overlap policy — target slower than its interval

**Behaviour: SKIP. A monitor with a check already in flight is never started a
second time.**

The scheduler keeps an in-process `Set` of in-flight monitor ids. A due monitor
already in that set is skipped, and the skip is counted (`scheduler_skipped`)
rather than silently swallowed.

Why skip rather than queue or cancel:

- **Queue** builds an unbounded backlog against a target that is *already*
  struggling. Every queued check is stale on arrival, and the queue amplifies
  load on a failing endpoint — a monitoring system should never become the thing
  that finishes off a customer's service.
- **Cancel** (kill the running check, start a fresh one) throws away the most
  valuable signal we have. A check that is taking a long time *is* the
  measurement; cancelling it guarantees we never record the slow result. It also
  wastes the work already done.
- **Skip** keeps cadence honest: samples stay evenly spaced in wall-clock terms,
  load against the target is bounded at one in-flight request per monitor, and
  the system self-heals the moment the target speeds up.

The check is bounded anyway: total check duration is capped by the per-check
deadline (§5), so a skipped cycle is at most a bounded delay, not an indefinite
one. Skips are exposed as a metric so scheduler lag is observable instead of
invisible.

---

## 4. Process restart mid-check

**Behaviour: an interrupted check is discarded, never half-recorded. The monitor
becomes due again and is re-checked on the next tick after startup.**

This works because of three properties:

1. **Nothing is written until the check is complete.** A single terminal write
   records the result — status, timings and log row. There is no "check started"
   row to reconcile, so a process killed mid-flight leaves no partial state.
2. **All scheduling state is durable.** `nextCheckAt` lives on the monitor
   document, not in process memory. A restarted process reads it back and
   resumes on the correct cadence.
3. **Flap state is durable.** `consecutiveFailures` / `consecutiveSuccesses` are
   persisted on the monitor document (§6). A restart does not reset a monitor
   part-way through a failure streak, so an incident that was two failures into a
   three-failure threshold still opens on the next failure rather than starting
   over.

**No catch-up stampede.** If the process was down for an hour, every monitor is
overdue. The scheduler does **not** fire one check per missed interval. Overdue
monitors are checked once, then rescheduled from now. Backfilling missed checks
would produce a thundering herd against every target simultaneously at exactly
the moment the system is least healthy.

On shutdown (`SIGTERM`/`SIGINT`) the scheduler stops taking new work, waits for
in-flight checks up to `SCHEDULER_SHUTDOWN_GRACE_MS` (default 10s), releases the
lock, and exits.

---

## 5. Timeouts, retries, and the circuit breaker

**Per-attempt timeout.** Every HTTP attempt has a hard deadline of the monitor's
`timeout` (seconds). It is enforced on a timer that destroys the socket, not only
via the socket idle timeout — a target that trickles one byte at a time can hold
a socket open indefinitely without ever tripping an idle timeout.

**Retry ladder.** A failed attempt is retried up to `CHECK_MAX_RETRIES` (default
2 retries, 3 attempts total) with **exponential backoff and full jitter**:
`delay = random(0, min(base * 2^n, cap))`, base 250ms, cap 4s. Jitter matters
because without it every monitor that fails during a shared upstream outage
retries in lockstep, producing synchronised bursts.

Retries apply only to failures that are plausibly transient (connection refused,
reset, timeouts, DNS failure, 5xx). A clean, fast `404` is a real answer about
the target's state and is recorded immediately — retrying it just wastes the
worker pool.

The whole check, including its retries, is bounded by a **check deadline** so the
retry ladder cannot exceed the monitor's interval budget.

**Circuit breaker (per monitor).** Purpose: one dead endpoint must not consume a
disproportionate share of the worker pool.

| State | Behaviour |
|---|---|
| `CLOSED` | Normal. Attempt plus full retry ladder. |
| `OPEN` | Check is **skipped entirely** until the cooldown expires. No worker slot consumed, no HTTP request made. |
| `HALF_OPEN` | Exactly one attempt, **no retries**. Success → `CLOSED`, counters reset. Failure → `OPEN` with a longer cooldown. |

The breaker opens after `BREAKER_FAILURE_THRESHOLD` (default 5) consecutive
failed checks. Cooldown grows exponentially from `BREAKER_COOLDOWN_MS` (default
60s), doubling per consecutive open, capped at `BREAKER_MAX_COOLDOWN_MS` (default
15 min). Breaker state is persisted on the monitor document so it survives
restart.

**Honest trade-off:** while a breaker is open we record *nothing* — we do not
fabricate synthetic `DOWN` rows for checks we never performed. That would inflate
check counts with data we did not measure and corrupt the uptime denominator.
The consequence is a genuine gap in the time series for a long-dead endpoint. We
consider a visible gap strictly better than invented data. The monitor's `status`
field retains its last real value (`DOWN`), so the dashboard still shows the
target as down; only the sample density drops.

**Bounded worker pool.** At most `SCHEDULER_CONCURRENCY` (default 10) checks run
concurrently, regardless of how many monitors are due. The previous code used an
uncapped `Promise.all` over every monitor in the database.

---

## 6. Flap detection

**Behaviour: an incident opens only after N consecutive failed checks, and closes
only after M consecutive successful checks. N and M are configurable per
monitor.**

| Field | Default | Meaning |
|---|---|---|
| `failureThreshold` (N) | 3 | Consecutive failed checks required to open an incident. |
| `successThreshold` (M) | 2 | Consecutive successful checks required to close it. |

Counters live on the monitor document (`consecutiveFailures`,
`consecutiveSuccesses`); each is reset by an outcome of the opposite kind. Because
they are persisted, thresholds are evaluated correctly across restarts and across
leader failover.

This replaces the old `isReallyDown()` helper, which slept 2s and re-probed three
times *inside* the check — up to ~6s of a worker slot per failing monitor, with
no configurability, and it still opened an incident for any blip lasting more
than six seconds. Consecutive-check thresholds spread confirmation across real
intervals instead of blocking a worker, and let a noisy target be tuned without
a code change.

Incident open/close is **edge-triggered**: the transition fires exactly once when
a threshold is crossed, not on every subsequent check while the condition holds.
The old code called `createIncident` on every `DOWN→DOWN` check and relied on a
downstream `findOne({status:'ONGOING'})` lookup to swallow the duplicate.

---

## 7. Clock drift and skew

All *durations* are measured with the monotonic clock (`process.hrtime.bigint()`),
which is unaffected by wall-clock adjustments — NTP steps, DST, or a VM being
suspended and resumed. Wall-clock time is used only for the values we persist and
display (`timestamp`, `nextCheckAt`), where an absolute time is what is actually
meant.

Two specific hazards are handled:

- **Backward jump.** If the clock steps backwards, `nextCheckAt` can land far in
  the future and a monitor would silently stop being checked. The scheduler
  detects `now < lastChecked` and treats the monitor as immediately due,
  re-anchoring its schedule to the current time.
- **Forward jump.** A large forward step makes many monitors overdue at once.
  This is handled by the same no-catch-up rule as restart (§4): check once,
  reschedule from now, never backfill.

`nextCheckAt` is recomputed from **now plus interval** after each completed
check, rather than by incrementing the previous `nextCheckAt`. Incrementing
accumulates drift when checks take real time; anchoring to now does not. The
cost is that cadence is "interval between checks" rather than "checks at fixed
absolute instants" — the correct choice for uptime sampling, where the gap
between samples is what matters.

---

## 8. Data retention

Every check appends one document to `logs`. Left alone this grows without bound;
the collection previously had **no TTL and no index on `monitorId`/`timestamp`**,
so it grew forever and every dashboard query was a full collection scan.

- TTL index on `timestamp`, `expireAfterSeconds = LOG_RETENTION_DAYS` (default
  30 days). 30d is deliberately the widest uptime window we advertise (§9), so we
  never display a window we cannot fully back with data.
- Compound index `{ monitorId: 1, timestamp: -1 }` serving every dashboard query.

---

## 9. Uptime calculation

Uptime for the 24h / 7d / 30d windows is computed by a **single MongoDB
aggregation** using `$facet` — one round trip, three windows, all arithmetic
server-side. Nothing is loaded into application memory to be counted, which is
what the previous all-time-only implementation effectively did.

Uptime is `upChecks / totalChecks` within the window. Windows with zero checks
report `null`, not `100` — "we have no data" and "it was perfectly healthy" are
different statements, and conflating them is how monitoring dashboards learn to
lie.

---

## 10. Configuration reference

| Env var | Default | Purpose |
|---|---|---|
| `SCHEDULER_ENABLED` | `true` | Master switch (tests/CI disable it). |
| `SCHEDULER_TICK_MS` | `5000` | Scheduler wake-up interval. |
| `SCHEDULER_CONCURRENCY` | `10` | Max concurrent checks. |
| `SCHEDULER_LOCK_TTL_MS` | `30000` | Leader lease duration. |
| `SCHEDULER_SHUTDOWN_GRACE_MS` | `10000` | In-flight wait on shutdown. |
| `CHECK_MAX_RETRIES` | `2` | Retries per check (3 attempts total). |
| `CHECK_RETRY_BASE_MS` | `250` | Backoff base. |
| `CHECK_RETRY_CAP_MS` | `4000` | Backoff cap. |
| `BREAKER_FAILURE_THRESHOLD` | `5` | Consecutive failed checks before opening. |
| `BREAKER_COOLDOWN_MS` | `60000` | Initial open cooldown. |
| `BREAKER_MAX_COOLDOWN_MS` | `900000` | Cooldown ceiling. |
| `LOG_RETENTION_DAYS` | `30` | TTL on the `logs` collection. |

Per-monitor overrides: `interval`, `timeout`, `failureThreshold`,
`successThreshold`, `ignoreTlsErrors`, `active`.

**Hard floor:** `interval` is clamped to a minimum of **5 seconds** in the
scheduler regardless of the stored value. Without it, `interval: 0` would probe
a third-party endpoint as fast as the event loop allows — a self-inflicted
denial of service, and something the owner of that endpoint would reasonably
call abuse.

---

## 11. TLS certificate validation

Certificate validation is **on by default**. The previous implementation set
`rejectUnauthorized: false` globally for every target, which made the monitor
structurally incapable of detecting an expired or invalid certificate — one of
the most common causes of a real user-facing outage, and precisely the kind of
thing customers buy uptime monitoring to catch.

Monitors pointing at internal hosts with self-signed certificates can opt out
individually with `ignoreTlsErrors: true`. Certificate errors are treated as
non-retryable: they are stable, genuine answers about the target's health, so
retrying only burns worker-pool slots to reach the same conclusion.
