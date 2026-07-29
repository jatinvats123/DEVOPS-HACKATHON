# Architecture Decision Records

Each record captures one decision: the context it was made in, what was decided,
why, and — the part that matters most later — what it cost.

An ADR is not documentation of how the code works; `ARCHITECTURE.md` does that.
It is a record of *why the code is not something else*, written while the
alternatives were still fresh. The consequences sections are deliberately blunt,
because a decision record that only lists advantages is marketing.

| # | Decision | Status |
|---|---|---|
| [0001](0001-interval-polling-over-push.md) | Interval polling rather than push | Accepted |
| [0002](0002-mongodb-for-time-series.md) | MongoDB for check history, and what replaces it at scale | Accepted, with a known ceiling |
| [0003](0003-socketio-over-sse.md) | Socket.IO rather than Server-Sent Events | Accepted |
| [0004](0004-mongodb-ttl-distributed-lock.md) | Leader election with a MongoDB TTL lease lock | Accepted |

## Format

Context → Decision → Rationale → Consequences → Alternatives considered.

Records are immutable once accepted. A decision that is later reversed gets a
new record that supersedes the old one; the original stays, because the reasoning
that turned out to be wrong is usually more instructive than the reasoning that
was right.
