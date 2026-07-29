# WatchTower Operations Runbook

For whoever is holding the pager. Every alert below states what it means, how to
confirm it, how to fix it, and — where it matters — what *not* to do.

**A note on why this document exists at all.** WatchTower's failure mode is
silence. When it breaks, the API still answers, dashboards still render the last
known state, and customers are simply never told their service went down. A
healthy WatchTower and a completely dead one look identical from the outside.
Everything here is built around detecting that.

---

## 1. Sixty-second triage

| Question | Command |
|---|---|
| Is the process alive? | `curl -s $BASE/api/health` |
| Can it do work? | `curl -s $BASE/api/health/ready \| jq` |
| Is the scheduler ticking? | `curl -s $BASE/metrics \| grep scheduler_last_tick` |
| Who is the leader? | `curl -s $BASE/metrics \| grep scheduler_is_leader` |
| Are checks running? | `curl -s $BASE/metrics \| grep checks_executed_total` |
| Are alerts being delivered? | `curl -s $BASE/metrics \| grep notification_failures_total` |

`BASE=https://watchtower-monitoring.onrender.com`

**Fastest single question:** `/api/health/ready` returns 200 or 503 and names the
failing dependency in its body. Start there.

---

## 2. Health endpoints

| Endpoint | Question | Touches dependencies | Non-200 means |
|---|---|---|---|
| `GET /api/health` | Is the process alive? | **No** | The process is gone — restart it |
| `GET /api/health/ready` | Can this instance work? | Yes | Pull it from the load balancer |

Liveness deliberately checks nothing. A liveness probe that fails during a
database outage makes the orchestrator restart every replica simultaneously,
turning a recoverable dependency failure into a crash loop. If you are tempted to
"improve" liveness by adding a database check, that is the bug it is avoiding.

Readiness returns:

```json
{
  "data": {
    "status": "ready",
    "checks": {
      "mongodb":   { "status": "up", "latencyMs": 4 },
      "scheduler": { "status": "up", "lastTickAgeSeconds": 3, "isLeader": true }
    }
  }
}
```

`scheduler.status` values: `up`, `stale` (fails readiness), `starting` (does not
fail readiness — a cold instance can serve API traffic before its first tick),
`disabled` (`SCHEDULER_ENABLED=false`).

---

## 3. Alerts

### 3.1 — `SchedulerNotTicking` 🔴 critical

```promql
time() - watchtower_scheduler_last_tick_timestamp_seconds > 120
```

**Meaning.** No instance has completed a scheduler tick in two minutes. **Nobody
is being monitored.** This is the single most serious alert in the system: every
customer's dashboard still looks fine and every outage is going unreported.

**Diagnose**

```bash
curl -s $BASE/api/health/ready | jq '.data.checks.scheduler'
curl -s $BASE/metrics | grep -E 'scheduler_is_leader|scheduler_tick_duration'
# logs
grep -E '\[scheduler\]' <logs> | tail -50
```

Then work down this list:

1. **No leader.** `watchtower_scheduler_is_leader` is 0 on every instance. A
   stale lease is held by an instance that died without releasing it. It expires
   on its own within `SCHEDULER_LOCK_TTL_MS` (30s) — if it has been longer, the
   lock document is wedged:
   ```js
   db.scheduler_locks.findOne({ _id: 'monitor-scheduler' })
   // If expiresAt is in the past and nobody has taken over:
   db.scheduler_locks.deleteOne({ _id: 'monitor-scheduler' })
   ```
   Deleting it is safe. Acquisition is atomic, so the next tick elects a leader.
2. **Ticks are running long.** `watchtower_scheduler_tick_duration_seconds` near
   or above the tick interval. Usually many monitors pointing at slow targets.
   Raise `SCHEDULER_CONCURRENCY`, or check whether circuit breakers should have
   opened and did not.
3. **Scheduler disabled.** `SCHEDULER_ENABLED=false` was left set. Readiness
   reports `disabled` rather than `stale`.
4. **Process wedged.** Check `watchtower_nodejs_eventloop_lag_seconds`. Sustained
   lag above ~1s means the event loop is blocked; restart and capture a profile.

**Recover.** Restart the service. Leadership fails over automatically; no state
is lost, because scheduling state (`nextCheckAt`) and flap counters are persisted
on each monitor.

---

### 3.2 — `NotificationFailures` 🔴 critical

```promql
increase(watchtower_notification_failures_total[15m]) > 0
```

**Meaning.** An incident was detected correctly and the customer was **not told**.
From their perspective this is indistinguishable from us not monitoring at all —
which is why it is critical despite nothing appearing "down".

**Diagnose**

```bash
curl -s $BASE/metrics | grep notification_failures_total   # which channel
grep '\[notify\]' <logs> | tail -30
```

```js
// Recent failures, with the reason
db.notificationlogs.find({ status: 'Failed' }).sort({ createdAt: -1 }).limit(20)
```

| Channel | Likely cause | Fix |
|---|---|---|
| Email | SMTP auth rejected, quota exhausted, credentials rotated | Verify `SMTP_USER`/`SMTP_PASS`; Gmail app passwords expire |
| Webhook / Slack | Customer's receiver is down or the URL was revoked | Their problem — but confirm it is not every webhook, which would mean egress is broken |

**Delivery is best effort by design.** A failed send never rolls back an
incident, so the incident record is always correct even when the alert did not
arrive. `notificationlogs` is the audit trail — it answers "was the customer
told?" definitively.

---

### 3.3 — `MongoDBDown` 🔴 critical

```promql
watchtower_mongodb_up == 0
```

**Meaning.** Readiness cannot reach MongoDB. Checks fail to persist, incidents
cannot open, the API returns 500s.

**Diagnose**

```bash
curl -s $BASE/api/health/ready | jq '.data.checks.mongodb'
```

`readyState` reflects only what the driver believes; the readiness probe issues a
real `ping`, and the two diverge exactly during a partition the driver has not
noticed yet. Trust the ping.

**Common causes.** Atlas IP allow-list changed; connection string rotated; the
cluster is paused (Atlas free tier pauses after inactivity); connection pool
exhausted.

**Recover.** `ConnectDB` retries five times with exponential backoff and then
exits non-zero so the platform restarts it — a monitoring service that cannot
reach its database should fail loudly, not sit there monitoring nothing.

---

### 3.4 — `SchedulerLagHigh` 🟠 warning

```promql
watchtower_scheduler_lag_seconds > 60
```

**Meaning.** The most overdue monitor was more than a minute late. Checks are
still running, just behind — customers see stale statuses and delayed alerts.

**Diagnose.** Compare `watchtower_scheduler_tick_duration_seconds` against the
tick interval, and `watchtower_checks_skipped_total{reason="overlap"}` — a high
skip rate means targets are slower than their configured intervals.

**Fix.** Raise `SCHEDULER_CONCURRENCY` (default 10) — it is the direct lever.
If lag persists with concurrency raised, the single-leader model has been
outgrown; see the sharding note in `docs/adr/`.

**Expected briefly after a restart**, when every monitor is due at once. It
should clear within a couple of ticks — the scheduler deliberately does *not*
backfill missed checks.

---

### 3.5 — `CheckFailureRateHigh` 🟠 warning

```promql
sum(rate(watchtower_checks_executed_total{status="DOWN"}[10m]))
  / sum(rate(watchtower_checks_executed_total[10m])) > 0.5
```

**Meaning.** More than half of all checks are failing across all customers.

Ask first: **is this us or them?** More than half of *unrelated* targets failing
simultaneously is almost never a real correlated outage.

**Usually us:** egress blocked, DNS resolution broken in the container, or
outbound rate limiting. Confirm from inside the container:

```bash
docker compose exec backend node -e \
  "fetch('https://example.com').then(r=>console.log('egress ok',r.status)).catch(e=>console.log('egress FAILED',e.message))"
```

If egress is fine and the failures are genuine, no action — the system is working
and customers are being alerted correctly.

---

### 3.6 — `CircuitBreakersOpen` 🟡 info

```promql
increase(watchtower_checks_skipped_total{reason="breaker_open"}[1h]) > 100
```

**Meaning.** Endpoints have been dead long enough to trip their breakers, so they
are now probed on a backoff instead of every interval. **This is the system
working as designed** — it stops one dead endpoint consuming the worker pool.

Only worth investigating if it spikes suddenly across many monitors at once,
which points at an egress problem rather than customer outages.

Note: while a breaker is open, no check result is recorded — the time series
shows a genuine gap rather than fabricated `DOWN` rows. Uptime denominators stay
honest; sample density drops.

---

### 3.7 — `HighAPILatency` 🟠 warning

```promql
histogram_quantile(0.95,
  sum by (le, route) (rate(watchtower_http_request_duration_seconds_bucket[5m]))
) > 2
```

**Diagnose.** Which route? `/api/metrics/*` endpoints run aggregations — if those
are slow, check that the `{monitorId, timestamp}` index on `logs` exists:

```js
db.logs.getIndexes()
```

Without it every dashboard query is a full collection scan. Also check
`watchtower_nodejs_eventloop_lag_seconds`; if lag is high the problem is CPU, not
the database.

---

## 4. Common operations

### Find everything about one request

Every response carries `X-Request-Id`, and every log line emitted while handling
that request carries the same id — including from code several layers deep that
knows nothing about HTTP.

```bash
grep '"requestId":"<id>"' <logs>
```

Ask a reporting user for the id from their failed response; it turns a bug report
into a search.

### Reading the logs

Production logs are JSON on stdout — `docker logs`, or Render's log stream.

```bash
docker compose logs backend | jq 'select(.level=="error")'
docker compose logs backend | jq 'select(.requestId=="<id>")'
docker compose logs backend | jq 'select(.msg|test("\\[scheduler\\]"))'
```

Secrets are redacted by the logger itself (passwords, tokens, cookies,
`authHeaders`, SMTP and JWT secrets) rather than by each call site remembering to.
If you see `[REDACTED]`, that is working.

Set `LOG_LEVEL=debug` temporarily to raise verbosity. Do not leave it on — it is
noisy and increases log cost.

### Verify a deploy

```bash
curl -s $BASE/api/health/ready | jq '.data.status'
curl -s $BASE/metrics | grep watchtower_scheduler_last_tick_timestamp_seconds
```

`deploy.yml` does this automatically and rolls back to the previously-live deploy
if the health check fails. A run that rolled back still reports failure — a
rollback is not a successful deploy.

### Roll back manually

Render dashboard → service → Deploys → pick the last known-good → **Redeploy**.
Or re-run the deploy workflow against the previous commit.

### Pause a noisy monitor

```js
db.monitors.updateOne({ _id: ObjectId('...') }, { $set: { active: false } })
```

Paused monitors are skipped entirely by the scheduler. Prefer this to deleting —
it preserves history.

### Tune a flapping monitor

A target that alternates up/down generates incident churn. Raise its thresholds
rather than muting it:

```js
db.monitors.updateOne(
  { _id: ObjectId('...') },
  { $set: { failureThreshold: 5, successThreshold: 3 } }
)
```

Takes effect on the next check; counters are persisted, so no restart is needed.

### Reset a stuck circuit breaker

```js
db.monitors.updateOne(
  { _id: ObjectId('...') },
  { $set: { breakerState: 'CLOSED', breakerRetryAt: null, breakerConsecutiveOpens: 0 } }
)
```

Rarely necessary — a half-open probe closes the breaker automatically once the
target recovers.

---

## 5. Scaling past one instance

Scheduling is **active/passive**: one leader does all checking, elected via a
MongoDB TTL lease. Extra instances serve API traffic and stand by to take over
within one lease TTL.

Adding replicas therefore scales the API but **not** the checking. If the
scheduler is saturated (see 3.4), raising `SCHEDULER_CONCURRENCY` is the lever;
partitioned scheduling is the next architectural step, not a config change.

Correctness note: the TTL index on `scheduler_locks` is garbage collection only.
MongoDB's TTL monitor sweeps roughly once a minute, so correctness comes from the
`expiresAt` comparison inside the acquisition query. A design that waited for TTL
deletion would stall failover for up to a minute.

---

## 6. Configuration reference

Scheduler tunables are documented in [SCHEDULER.md](SCHEDULER.md) §10.
Observability-specific settings:

| Variable | Default | Purpose |
|---|---|---|
| `LOG_LEVEL` | `info` (prod) / `debug` | pino level |
| `LOG_IN_TESTS` | `false` | Enable log output during tests |
| `METRICS_TOKEN` | unset | Require `Authorization: Bearer` on `/metrics` |
| `SCHEDULER_ENABLED` | `true` | Set false for API-only instances |

`/metrics` is open when `METRICS_TOKEN` is unset, and warns once at scrape time
in production. That is deliberate: an endpoint that 401s at an unconfigured
scraper is indistinguishable from a service that is down, and operators lose an
hour to it. Set the token in production and configure the scraper to send it.

---

## 7. Escalation

1. Check this runbook.
2. Check CI — is `main` green? A bad deploy is the most likely cause of a sudden
   change in behaviour.
3. Roll back (§4). Restoring service comes before diagnosis.
4. Contact the maintainers in [CONTRIBUTORS.md](../CONTRIBUTORS.md).

**Order matters.** Roll back first, understand afterwards. The logs, metrics and
`notificationlogs` audit trail will still be there once service is restored.
