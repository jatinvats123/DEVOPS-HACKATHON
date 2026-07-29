# ADR 0002 — MongoDB for check history, and what would replace it at scale

**Status:** Accepted, with a known ceiling · **Date:** 2026-07-28

## Context

Every check writes one row: timestamp, status, status code, error, attempt
count, and a latency breakdown (DNS / TCP / TLS / TTFB / total). This is
append-only time-series data, and it is the highest-volume thing the system
produces.

Volume is `monitors × (86400 / interval)` rows per day. At 1,000 monitors on a
60-second interval that is **1.44 million rows per day**, or roughly 43 million
in a 30-day retention window. The application already uses MongoDB for users,
monitors, incidents and channels.

## Decision

Store check history in MongoDB, in a `logs` collection with a TTL index and a
compound `{ monitorId: 1, timestamp: -1 }` index. Compute uptime windows with a
single `$facet` aggregation.

Do not introduce a dedicated time-series database at this stage.

## Rationale

**One datastore is a genuine architectural advantage at this size.** A second
store means a second connection pool, a second backup and restore procedure, a
second failure mode during deploys, a second thing to monitor, and a class of
bug where the two disagree about what happened. That cost is paid immediately;
the benefit only arrives at a volume this deployment does not have.

**The access pattern is narrow and index-friendly.** Every query is "recent
checks for one monitor" or "aggregate over a window for one monitor". The
compound index serves both directly. There is no ad-hoc analytical querying
across all tenants, which is where document stores genuinely struggle.

**Retention is a one-line index, not a job.** A TTL index on `timestamp` bounds
growth without a cron job, a partitioning scheme, or an operator remembering to
prune. Before this, the collection had *no* TTL and *no* index on
`monitorId`/`timestamp`: it grew forever and every dashboard query was a full
collection scan.

**Aggregation is fast enough and honest.** Uptime for 24h/7d/30d is one round
trip using `$facet`, computed server-side. The previous implementation loaded
documents and counted them in application memory over unbounded history.

## Consequences

**Storage is inefficient.** MongoDB stores each document with its full key names
and BSON overhead — roughly 200–300 bytes per check where a columnar time-series
store would use single-digit bytes after delta-of-delta timestamp encoding and
compression. We are paying an order of magnitude more disk than the data
deserves.

**Aggregation cost grows linearly with the window.** A 30-day uptime query scans
every check in 30 days for that monitor. At a 60-second interval that is ~43,000
documents — fine. At a 10-second interval across a year it would not be.

**No downsampling.** A one-year view would scan a year of raw checks because
there are no pre-rolled hourly or daily aggregates.

## The ceiling, and what replaces it

The trigger to migrate is roughly **10 million checks per day** (~7,000 monitors
at 60s), or the first uptime query that takes longer than a second.

**TimescaleDB** is the migration I would choose. It is PostgreSQL, so the
relational data (users, monitors, incidents) can live in the same database with
real foreign keys and transactions — which removes a class of orphaned-record
bug that MongoDB currently makes possible. Hypertables partition by time
automatically, native compression reaches 10–20× on this shape of data, and
continuous aggregates maintain rolled-up hourly/daily uptime incrementally, so a
one-year query reads pre-computed buckets instead of raw rows. The migration is
mechanical: the write path is one `insertMany`, and the read path is three
aggregations.

**Prometheus with remote write** would be the choice if this became primarily a
metrics product. It is purpose-built for exactly this shape, and WatchTower
already exposes Prometheus metrics about itself. Rejected here because
Prometheus is designed for monitoring *your own* infrastructure with a global
label namespace — per-tenant isolation, per-tenant retention and the ability to
query one customer's history without exposing another's are awkward to build on
top, and tenancy is a hard requirement.

**ClickHouse** would win on raw analytical performance and compression, and is
the right answer if the product grows a "query across all your monitors over a
year" feature. Rejected for now as a third operational system to run for a
workload that is currently point lookups by monitor id.

## Alternatives considered

**MongoDB native time-series collections.** Genuinely tempting — columnar
storage and automatic bucketing without leaving MongoDB. Not adopted because
they impose real restrictions: documents cannot be updated or deleted
individually, secondary indexes are more limited, and the tenancy scoping the
DAO layer depends on becomes harder to express. Worth revisiting if the
constraints relax.

**Keep everything in memory, persist only aggregates.** Rejected outright: an
incident investigation needs the individual checks that caused it. "It was down
for four minutes" is not useful without the status codes and timings that show
*how*.
