# ADR 0004 — Leader election with a MongoDB TTL lease lock

**Status:** Accepted · **Date:** 2026-07-28

## Context

The scheduler was guarded by a module-scoped `isRunning` boolean. That is
correct in exactly one process and undefined everywhere else.

With two instances — any horizontal scale, or simply the overlap window of a
rolling deploy where the old container has not exited before the new one starts
— every instance checked every monitor. The consequences are not cosmetic:

- duplicate HTTP load on every customer's endpoint,
- duplicate rows in check history, corrupting the uptime denominator,
- duplicate incidents,
- **duplicate alert emails to customers.**

The last one is the reason this was the highest-priority defect found in the
audit. A monitoring product that emails you twice about the same outage has
undermined the only thing it sells.

## Decision

Elect a single leader with a **lease lock in MongoDB**. One document, `_id:
"monitor-scheduler"`, holding `owner` and `expiresAt`. Only the leader executes
checks; followers keep ticking and keep trying to acquire, so failover needs no
external coordination.

## How it works

Acquisition and renewal are the same single atomic operation:

```js
findOneAndUpdate(
  {
    _id: 'monitor-scheduler',
    $or: [{ expiresAt: { $lte: now } }, { owner: me }],
  },
  {
    $set: { owner: me, expiresAt: now + TTL, heartbeatAt: now },
    $setOnInsert: { acquiredAt: now },
  },
  { upsert: true, returnDocument: 'after' }
);
```

Three properties do the work:

1. **Atomicity comes from the unique `_id` index.** Two instances racing the
   same upsert cannot both succeed — the loser gets a duplicate-key error
   (E11000), which is treated as "someone else leads", not as a fault.
2. **The filter never steals a live lease.** It matches only if the lease has
   expired *or* we already own it. Renewal is therefore the same call as
   acquisition, with no separate code path to get wrong.
3. **Expiry is evaluated in the query, against `now`.**

### The TTL index is garbage collection, not correctness

This is the subtle part and the thing most likely to be got wrong by someone
reading the code later.

There *is* a TTL index on `expiresAt`, but **correctness does not depend on it**.
MongoDB's TTL monitor sweeps roughly once every 60 seconds, so an expired lock
document can sit there long past its `expiresAt`. A design that waited for the
document to be physically deleted before re-acquiring would stall failover for
up to a minute.

Correctness comes from comparing `expiresAt <= now` inside the acquisition
query. The index exists only so abandoned documents do not accumulate.

### Lifecycle

- **TTL:** 30s, renewed every 5s tick — six renewal opportunities per lease, so
  a couple of slow ticks or a transient database blip do not cause a spurious
  failover.
- **Graceful shutdown** deletes the lock, scoped by owner, so a standby takes
  over immediately instead of waiting out the TTL. Without this, every deploy
  paused monitoring for up to 30 seconds.
- **Release is owner-scoped** (`deleteOne({ _id, owner: me })`) so a leader that
  has already lost its lease cannot delete the *new* leader's document.
- **A database error means not-leader.** A lock we cannot prove we hold is
  treated as not held: the failure mode must be "nobody checks", never
  "everybody checks".

## Rationale

**No new infrastructure.** MongoDB is already a hard dependency with connection
handling, retries and monitoring in place. Adding Redis or etcd purely for a
lock means another service to run, secure, back up and reason about during an
outage — for a workload that acquires a lock once every five seconds.

**The failure modes are understood and bounded.** The worst case is a stale
leader continuing to check for up to one TTL after a network partition, which
produces at most one duplicate check round. Compared against "every instance
checks everything, forever", that is a large improvement for very little
machinery.

## Consequences

**This is active/passive, not partitioned.** One leader does all checking, so
adding replicas scales the API but **not** the scheduler. The lever when the
scheduler saturates is `SCHEDULER_CONCURRENCY`; beyond that, partitioned
scheduling (shard monitors by hash, each shard with its own lease) is the next
step. That is a real architectural change, not a config flag, and it is not
implemented.

**Not a fencing token.** This is a *lease*, not a distributed mutex with
fencing. During a partition, a leader that has lost its lease may not know it
yet and can continue checking until its next failed renewal. Two writers can
therefore overlap briefly. Tolerated because the consequences of a duplicate
check are small and self-correcting — an extra log row and an extra HTTP
request — and because the genuinely dangerous duplicate, opening the same
incident twice, is prevented independently by a partial unique index on
`{ monitorId }` where `status: 'ONGOING'`. If checks ever became destructive,
this reasoning would not survive.

**Clock skew between instances affects lease timing.** Each instance computes
`now` locally, so a badly skewed clock could expire a lease early or hold it
late. NTP keeps this well inside the 30s TTL in practice.

## Alternatives considered

**Redis with `SET NX PX` / Redlock.** The conventional answer, and better if
Redis were already in the stack. Rejected as a new operational dependency for
one lock. Redlock specifically has well-documented correctness criticisms and
would be over-engineering here.

**etcd or ZooKeeper.** Purpose-built consensus with real fencing tokens. Vastly
disproportionate — these are systems you adopt when you already have a cluster
manager needing them.

**Every instance checks; deduplicate on write.** Deduplicating check rows is
feasible with a unique index, but it does not stop the duplicate outbound HTTP
requests hitting customer endpoints, which is a large part of the harm.

**Run exactly one instance and never scale.** Honest and simple, but it makes
every deploy a monitoring outage and one crash a total outage, with no path
forward. The lock costs ~120 lines.

**Partition monitors across instances by hash.** The correct answer at scale and
where this heads next. Rejected now as premature: it needs consistent hashing,
rebalancing on membership change, and its own failure detection — significantly
more complexity than a single leader for a workload nowhere near saturating one.
