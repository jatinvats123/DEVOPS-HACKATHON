# ADR 0003 — Socket.IO rather than Server-Sent Events

**Status:** Accepted · **Date:** 2026-07-28

## Context

The dashboard must reflect status changes without the user refreshing. Traffic
is overwhelmingly **server → client**: check results, incident opened, incident
closed. The one exception is the AI assistant chat, which is bidirectional.

Options: Server-Sent Events, raw WebSocket, Socket.IO, or HTTP polling.

Worth stating plainly: before this work, the "live status over Socket.IO"
described in the README **was not real**. A Socket.IO server existed and
authenticated connections, but the scheduler emitted nothing into it — the
dashboard was polling `/api/logs` on a timer. This ADR records the decision made
when that was actually implemented.

## Decision

Socket.IO, with JWT verified at handshake and every socket joined to exactly one
server-assigned room.

## Rationale

**Reconnection is the hard part, and it is not the transport.** SSE has
automatic reconnection built in, which sounds like it settles the question. It
does not, because reconnecting is the easy half. The hard half is that events
are **not queued while disconnected** — reconnecting restores the pipe but not
the missed events, so a dashboard that only listens silently displays state
frozen at the moment the connection dropped. On a status dashboard that means
confidently showing "all systems operational" through an outage that began while
the socket was down.

That problem has to be solved in application code either way: reconnect, then
refetch. Socket.IO's advantage is that it exposes the lifecycle
(`reconnect_attempt`, `connect_error`, distinguishable disconnect reasons) so we
can drive that resync and show an accurate connection indicator. SSE's
`EventSource` gives an `onerror` that fires for every failure mode
identically — we could not tell "server restarting" from "your JWT expired",
which are opposite messages for the user.

**The chat feature needs bidirectional messaging.** SSE is unidirectional by
construction. With SSE, chat would need a parallel POST endpoint plus its own
correlation between the POST and the streamed reply — two mechanisms where
Socket.IO needs one.

**Rooms are exactly the tenancy primitive required.** Every socket joins
`user:<id>`, derived from the verified token, and all tenant data is emitted
into a room. There is deliberately no client-controlled `join` handler. Building
equivalent isolation over SSE means hand-rolling a subscriber registry keyed by
user and remembering to consult it at every emit site — the same guarantee, but
enforced by convention rather than by the library.

**Transport fallback.** Socket.IO degrades to HTTP long-polling where WebSockets
are blocked by a corporate proxy. SSE over HTTP/1.1 also carries a real
constraint: browsers cap connections at ~6 per origin, and each open
`EventSource` consumes one. A user with several dashboard tabs open can exhaust
it and block ordinary API requests.

## Consequences

**A dependency and a protocol.** Socket.IO is not raw WebSocket — client and
server must both speak its framing, so a third-party integrator cannot connect
with a generic WebSocket client. Acceptable: the realtime channel serves our own
dashboard, and integrators are served by the REST API and webhooks.

**Bundle cost.** ~41 KB (13 KB gzipped) on the client. Mitigated by splitting it
into its own chunk, so it is not downloaded by the login page.

**Sticky sessions if horizontally scaled with polling fallback.** The HTTP
long-polling transport requires successive requests to reach the same instance.
Not a problem today (single instance), but scaling out needs either sticky
routing or the Redis adapter. Noted as a limitation.

**Authorisation is our job, not the library's.** Socket.IO happily accepts every
connection unless told otherwise. This is handled at handshake — a token that
verifies but carries no subject is rejected, because a socket that cannot be
scoped to a room must not exist — and covered by tests asserting one tenant's
socket receives nothing emitted to another.

## Alternatives considered

**Raw WebSocket (`ws`).** Smallest and fastest, no protocol lock-in. Rejected
because it means implementing reconnection with backoff and jitter,
heartbeat/liveness, and a room registry by hand — reimplementing the parts of
Socket.IO that are actually load-bearing here, with less scrutiny.

**Server-Sent Events.** The strongest alternative and genuinely simpler for the
push-only traffic. Rejected on the combination of: no bidirectional channel for
chat, indistinguishable error states preventing an accurate connection
indicator, the 6-connection-per-origin ceiling across tabs, and having to build
room-equivalent tenancy by hand.

**Keep HTTP polling.** What the product was actually doing. Rejected: it costs a
full request per interval per open tab regardless of whether anything changed,
and it makes "live" a marketing claim rather than a property of the system.
