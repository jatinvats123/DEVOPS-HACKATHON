# WatchTower — Phase 0 Audit

**Date:** 2026-07-28
**Scope:** Full read-only audit of the `main` branch before any hardening work.
**Method:** Static reading of every backend source file, all routes/controllers/services/models, the scheduler, both Socket.IO implementations, the frontend real-time path, Docker/compose, and git tracking state. No files other than this `AUDIT.md` were changed.

> **Bottom line:** The late data-leak patch (commit `e7c8494`) did close the obvious REST leaks — every data route is authenticated and controllers are owner-scoped today. But tenancy is enforced *by convention in each controller*, not at a data-access layer, so it is one forgotten `.find()` filter away from regressing, and there is no test guarding it. The **scheduler is the real liability**: it has no coordination across processes, no concurrency cap, no real flap detection, and a suspected `pre('save')` hook defect. Repo hygiene issues (committed build output, README link/badge defects, zero tests, zero CI) are real but low-risk to fix.

---

## 1. Route inventory — every route with auth status

Legend: **Auth** = authentication middleware present. **Owner-scoped** = the query is filtered by the caller's `userId` (or ownership is asserted) so it cannot return another tenant's data.

### `/api/auth` — `Backend/src/routes/user.routes.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| POST | `/register` | Public | n/a | Intended public. `console.log(req.body)` leaks password (see risk #5). Force-verifies (#6). |
| POST | `/login` | Public | n/a | Intended public. No auth-specific rate limit (#9). |
| POST | `/logout` | `verifyJWT` | n/a | Clears cookie. |
| POST | `/verify/:id` | Public | n/a | OTP verify — effectively dead code because register auto-verifies. |
| POST | `/forgot-password` | Public | n/a | Reset link points at a **POST** route, so the emailed URL won't work via browser GET. |
| POST | `/reset-password/:token` | Public | n/a | Token lookup is time-boxed. OK. |
| POST | `/change-password` | `verifyJWT` | self | OK. |
| GET | `/profile` | `verifyJWT` | self | Returns full user doc incl. `otp`,`forgotPasswordToken` fields (password is `select:false`). Minor over-exposure. |
| PATCH | `/profile` | `verifyJWT` | self | OK. |

### `/api/monitor` — `Backend/src/routes/monitor.route.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| POST | `/` | `verifyJWT` | yes (sets `userId`) | Dedup on `{userId,url}`. |
| GET | `/` | `verifyJWT` | yes `{userId}` | OK. |
| DELETE | `/:monitorId` | `verifyJWT` | yes `{_id,userId}` | OK. |
| PUT | `/:monitorId` | `verifyJWT` | **guarded, not scoped** | Ownership asserted, then `findByIdAndUpdate(monitorId,...)` runs **unscoped**. Safe today (TOCTOU only), fragile pattern. |

### `/api/incidents` — `Backend/src/routes/incident.route.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| GET | `/` | `verifyJWT` | yes (via `getUserMonitorIds`) | OK. |
| GET | `/detail/:incidentId` | `verifyJWT` | **guarded, not scoped** | Unscoped `findById` then manual `userId` string compare. One forgotten compare = leak. |
| GET | `/:monitorId` | `verifyJWT` | yes (`assertMonitorOwned`) | OK. |

### `/api/logs` — `Backend/src/routes/logs.route.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| GET | `/` | `verifyJWT` | yes (via `getUserMonitorIds`) | OK. |
| GET | `/:monitorId` | `verifyJWT` | yes (`assertMonitorOwned`) | OK. |

### `/api/metrics` — `Backend/src/routes/metrics.route.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| GET | `/latency/:monitorId` | `verifyJWT` | yes (`assertMonitorOwned`) | OK. |
| GET | `/uptime/:monitorId` | `verifyJWT` | yes (`assertMonitorOwned`) | Uptime is **all-time only**, no 24h/7d/30d windows (Phase 2 gap). |
| GET | `/status-timeline/:monitorId` | `verifyJWT` | yes (`assertMonitorOwned`) | OK. |

### `/api/channels` — `Backend/src/routes/channel.route.js`
| Method | Path | Auth | Owner-scoped | Notes |
|---|---|---|---|---|
| GET | `/logs` | `verifyJWT` | yes `{userId}` | OK. |
| GET | `/` | `verifyJWT` | yes `{userId}` | OK. |
| POST | `/` | `verifyJWT` | yes (sets `userId`) | OK. |
| PATCH | `/:channelId` | `verifyJWT` | yes `{_id,userId}` | OK. |
| DELETE | `/:channelId` | `verifyJWT` | yes `{_id,userId}` | OK. |
| POST | `/:channelId/test` | `verifyJWT` | yes `{_id,userId}` | OK. |

### `/api/health` — `Backend/src/routes/health.route.js`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | Public | Returns static `"All Good!"`. No DB/scheduler check. No `/health/ready`. No `/metrics` (Prometheus). Phase 6 gaps. |

**Non-route handlers** (`Backend/src/app.js`): `/api/*` unknown → JSON 404 (good, no SPA shell leak); everything else → SPA `index.html`.

**Verdict:** Authentication coverage is complete and correct — every non-public route has `verifyJWT`. No missing-auth routes found.

---

## 2. Socket.IO events — authorization analysis

Two Socket.IO server implementations exist. Only one is wired up.

| File | Auth on handshake | Room scoping | Wired up? |
|---|---|---|---|
| `Backend/src/sockets/server.socket.js` | **Yes** — `io.use` verifies JWT from the auth cookie (`:28-41`) | Yes — `socket.join('user:'+userId)` (`:45`) | **Yes** (`server.js:19`) |
| `Backend/src/config/socket.js` | **No** — bare `new Server()`, no `io.use` | No | No — but a live landmine (risk #3) |

### Events on the active implementation
| Direction | Event | Authorization | Leak risk |
|---|---|---|---|
| handshake | `connection` | JWT verified from cookie / `auth.token`; rejects on failure | None — good |
| inbound | `chat:message` | Authenticated at handshake only. **No per-message authz, no rate limit, no input cap beyond `slice(-10)` history.** AI prompt only, no tenant data touched. | Low (abuse/cost, not tenancy) |
| outbound | `chat:typing` / `chat:chunk` / `chat:reply` / `chat:error` | Emitted with `socket.emit(...)` → only to the originating socket | None |
| n/a | `emitToUser(userId,event,payload)` | Helper emits into `user:<id>` room (`:67-70`) | **Defined but never called anywhere** |

**Finding:** The advertised "live status streaming over Socket.IO" is not real. The scheduler emits **nothing**. Live monitor status in the UI is actually **HTTP polling** (`Frontend/src/features/monitoring/hooks/useStatus.js` → `getLogsByMonitorId`). The only working socket feature is the AI chat widget. The per-user room plumbing is correct and ready, just unused. There is currently **no path by which one tenant receives another tenant's socket events**, because no tenant events are emitted at all.

---

## 3. Scheduler execution model — `Backend/src/jobs/monitorCron.js`

```
node-cron  "*/10 * * * * *"  (every 10s, in-process)
   └─ guard: module-scoped `isRunning` boolean  ← only prevents overlap WITHIN one process
        └─ monitorModel.find()                  ← loads ALL monitors, ALL tenants, into memory
             └─ Promise.all(monitors.map(...))   ← NO concurrency cap
                  └─ per monitor:
                     • due? (now - lastChecked) >= interval-2s   ← wall-clock comparison
                     • checkMonitor(url, timeout*1000)           ← axios GET, TLS verify DISABLED
                     • if DOWN → isReallyDown(): 3× (sleep 2s + recheck)  ← up to ~6s, sequential
                     • save status/lastChecked/lastStatusCode
                     • logModel.create({...})                    ← one row per check, forever
                     • incident open (UP→DOWN or DOWN→DOWN) / close (DOWN→UP)
```

### Undefined / unsafe behaviors (exactly the Phase 2 targets)
- **Process restart mid-check:** in-flight checks and retries are lost; no "in progress" persistence. Recovery relies on `lastChecked`, so the *next* tick re-checks — acceptable, but a check interrupted mid-retry simply restarts, and a crash during `monitor.save()`/`logModel.create()` can drop a result silently.
- **Overlapping checks (target slower than its interval):** partially handled inside one process by `isRunning`, but a single slow monitor's `isReallyDown` (~6s) holds a slot in `Promise.all`; there is no per-monitor overlap policy (skip/queue/cancel) and no timeout on the *aggregate* run.
- **Clock drift / skew:** all timing is wall-clock (`Date.now()`, `new Date(lastChecked)`). A backward clock jump can skip or double-fire checks; there is no monotonic clock or drift compensation.
- **More than one server instance:** **no coordination whatsoever.** Every instance runs every monitor every 10s → duplicate HTTP checks, duplicate log rows, duplicate incidents, and **duplicate notification emails**. No distributed lock, no leader election. This is the single biggest correctness risk (#1).
- **Flap detection:** only an in-tick `isReallyDown` (3 quick rechecks). No configurable **N consecutive failures to open** / **M consecutive successes to close**; thresholds are not per-monitor. A blip that survives ~6s opens an incident immediately.
- **Circuit breaker / backpool protection:** none. Dead endpoints keep getting full retry treatment every cycle.
- **Latency granularity:** only total wall-time is recorded. No DNS / TCP / TTFB breakdown.

---

## 4. Tenancy — where one tenant's data could leak into another's response

**Current state (post `e7c8494`): the known REST leaks are closed.** Ownership helpers live in `Backend/src/utils/ownership.js` (`getUserMonitorIds`, `assertMonitorOwned`, which throws 404 not 403 to avoid existence disclosure). Every list endpoint is scoped and every by-id endpoint asserts ownership.

**Residual structural risks (not currently exploitable, but unguarded):**
1. **No DAO/repository layer.** Scoping is duplicated inline in each controller. A future controller that forgets `{ userId }` (or forgets `assertMonitorOwned`) re-opens the exact class of bug `e7c8494` fixed. **Phase 3 asks for a DAO that refuses unscoped queries + a test.**
2. **"Guarded, not scoped" endpoints** — `updateMonitorController` (`monitor.controller.js:96→109`) and `getIncidentByIdController` (`incident.controller.js:42-56`) do an unscoped `findById`/`findByIdAndUpdate` after a manual ownership check. Correct today; brittle.
3. **No regression test** proves user A cannot read user B's monitors/incidents/logs by id, by list, or over Socket.IO. This is explicitly required (Phase 3/4).
4. **`config/socket.js`** (unauthenticated Socket.IO) exists in-tree; if ever imported it would expose an unauthenticated realtime channel.
5. **Incident model** has a `userId` field that is never populated on create (`incident.service.js` sets only `monitorId`), so incident ownership is always resolved indirectly through the monitor — extra join surface for mistakes.

---

## 5. Committed build artifacts

Tracked generated output (should not be in git; must build at runtime):

| Path | Size | Notes |
|---|---|---|
| `Backend/public/dist/index.html` | ~0.5 KB | SPA shell |
| `Backend/public/dist/assets/index-DT9hluDN.css` | 46,219 B | hash-named |
| `Backend/public/dist/assets/index-gh1gvx6u.js` | 863,214 B | hash-named; single 843 KB JS bundle (also a Phase 7 code-splitting target) |

**Total ≈ 910 KB** of build output committed. Because filenames are content-hashed, every rebuild adds **new** orphaned files unless manually pruned — the directory only grows. `Backend/public/dist/` is in **no** `.gitignore`.

**Clean elsewhere:**
- `node_modules` is **not** tracked (verified: 0 tracked entries). Good.
- **No real `.env` is tracked.** `Backend/.env.example` / `Frontend/.env.example` contain placeholders only (`JWT_SECRET=secret key`, `SMTP_PASS=your app password`) — safe, but should be tidied.

---

## 6. Top 10 riskiest lines (`file:line`)

1. **`Backend/src/jobs/monitorCron.js:27,30`** — Scheduler is guarded only by an in-process `isRunning` boolean. With >1 instance (any horizontal scale, or overlapping deploy) every instance checks every monitor → duplicate checks, duplicate log rows, duplicate incidents, **duplicate alert emails**. No distributed lock / leader election. *Highest-impact correctness defect.*
2. **`Backend/src/models/incidents.model.js:47-51`** — `pre('save')` hook declares `next` but never calls it on any path. Under Mongoose's callback-style middleware this can **hang every incident save** (create and resolve), which would also wedge the cron tick that awaits it. **Suspected latent defect — must be verified at runtime in Phase 2.**
3. **`Backend/src/config/socket.js:4-12`** — A second `initSocket` with **no JWT auth and no room scoping**. Unused today, but any stray import stands up an unauthenticated realtime server. Delete it.
4. **`Backend/src/services/monitor.service.js:14`** — `new https.Agent({ rejectUnauthorized: false })` disables TLS certificate validation for **every** monitored target. The monitor is structurally blind to expired/invalid certs (a primary uptime signal) and to MITM.
5. **`Backend/src/controllers/user.controller.js:9`** — `console.log(req.body)` in `registerUser` writes **plaintext passwords** to stdout / log aggregation on every signup.
6. **`Backend/src/controllers/user.controller.js:26`** — `user.isVerified = true` ("remove in production") force-verifies every account in all environments; the OTP/email-verify flow is dead. With no auth-specific rate limit this enables cheap account spam.
7. **`Backend/src/models/logs.model.js:3-25`** — Logs collection has **no TTL index and no index on `monitorId`/`timestamp`**. Every check appends a row forever (unbounded growth) and every uptime/latency/timeline query is a full collection scan.
8. **`Backend/src/jobs/monitorCron.js:13-21` (via `:74`)** — `isReallyDown` runs 3 sequential rechecks with fixed 2s sleeps (~6s) **inside `Promise.all` over all monitors with no concurrency cap and no circuit breaker**. A handful of dead endpoints can saturate the run and delay healthy checks.
9. **`Backend/src/app.middleware.js:17-23,56`** — One global limiter (300 / 15 min) on all `/api`; **auth routes have no stricter limit** → brute-force / credential-stuffing surface. Also **missing `express-mongo-sanitize` and `hpp`**.
10. **`Backend/src/controllers/incident.controller.js:42-56`** (pattern also in `monitor.controller.js:96-120`) — Tenancy isolation depends on a hand-written ownership check after an **unscoped** `findById`. No DAO enforcement, no regression test → the just-closed data-leak class can silently return.

*Honorable mentions:* `incident.service.js:31-33` duplicate `select` key in `.populate` (`select:'title'` overwritten by `select:'userId'`); `database.js:6` no connection retry/backoff (single `catch` → `process.exit(1)`); `Frontend/Dockerfile` runs Vite **dev** server as the container command (not a production build); registration returns the JWT in the JSON body *and* an httpOnly cookie (token duplicated into JS-reachable storage).

---

## 7. Supporting-state snapshot (sets up Phases 1–6)

| Area | State |
|---|---|
| Tests | **Zero.** `Backend/package.json` test script is `echo "Error: no test specified" && exit 1`. No jest/supertest/mongodb-memory-server. |
| CI/CD | **None.** No `.github/` directory, no workflows. (The core irony for a DevOps project.) |
| Lint/format | ESLint + Prettier configs exist in both packages, but no root scripts, unknown pass/fail state. |
| Node pinning | No `.nvmrc`, no `engines` in either `package.json`, no `.editorconfig`. |
| Security middleware | `helmet` ✓, `cors` allow-list ✓ (`config.CORS_ORIGINS`), `compression` ✓, hand-rolled path blocklist ✓. **Missing:** strict auth rate limit, `express-mongo-sanitize`, `hpp`. |
| Secrets | Not committed ✓. `error.middleware.js` hides stack traces outside development ✓. |
| Docker | Backend Dockerfile is single-stage, runs as **root**, `npm start` (no `dumb-init`/signal handling). Frontend Dockerfile runs the **dev** server. compose has a mongo healthcheck concept but **no `depends_on: condition: service_healthy`**, no trivy/npm-audit gate, no Dependabot. |
| README | "Production Ready" badge (`:7`, unearned); Live Demo link display-text (`railway…`) ≠ href (`…onrender.com`) (`:12`); stray `---S` (`:16`); nested broken link (`:37`). **No `LICENSE` file** despite ISC badge/claims. |
| Observability | Winston logger (not pino), no request IDs, no secret redaction, no `/metrics`, no `/health/ready`, no runbook. |

---

## 8. Proposed sequencing (for your approval)

Nothing below has been done yet. Branch-per-phase, Conventional Commits, attribution preserved (add `CONTRIBUTORS.md`, no history rewrite).

- **Phase 1 — Hygiene:** untrack `Backend/public/dist/` (keep runtime build), fix README link/typo/badge (verify the live host responds *first*), ESLint/Prettier clean, add `.nvmrc`/`engines`/`.editorconfig`/root scripts.
- **Phase 2 — Scheduler correctness:** Mongo TTL distributed lock, concurrency cap + per-check timeout/retry-backoff/circuit-breaker, configurable N/M flap thresholds, latency metrics + TTL time-series, windowed uptime aggregation, pluggable notifier. Verify & fix the incident `pre('save')` hook first.
- **Phase 3 — Security/multi-tenancy:** DAO layer that refuses unscoped queries, socket room regression tests, `express-mongo-sanitize`/`hpp`/strict auth rate limit, env-driven CORS, encrypted outbound credentials, `SECURITY.md`.
- **Phase 4 — Tests (35+):** auth, tenancy matrix, scheduler (fake timers), incident lifecycle, uptime aggregation, `nock` targets, 60% statements gate.
- **Phase 5 — CI/CD:** `ci.yml` + `deploy.yml`, multi-stage non-root Dockerfiles, compose healthchecks, trivy/`npm audit` gate, Dependabot, real badges.
- **Phase 6 — Observability:** pino + request IDs + redaction, `/health/ready`, `/metrics`, `docs/RUNBOOK.md`.
- **Phase 7 — Frontend:** error boundaries/skeletons/empty states, socket reconnection + status indicator, WCAG AA (status not by colour alone), responsive, route code-splitting.
- **Phase 8 — Docs:** README rewrite (honest hackathon origin + your ownership), `CONTRIBUTORS.md`, OpenAPI 3.1 + Swagger UI, `docs/ARCHITECTURE.md`, ADRs, `docs/PRODUCTION-READINESS.md`.

**Open questions before Phase 1:**
1. Which host actually serves the app — `monitoring-production-19a5.up.railway.app` (Railway) or `watchtower-monitoring.onrender.com` (Render)? Recent commits mention Render; the README badge points at Railway. I will verify with a live request before editing the link, but tell me if you already know the canonical one.
2. Confirm which areas **you personally owned** so `CONTRIBUTORS.md` and the README are accurate (the four contributors in git history are Gaurav, Satyajit, Rajiv, and you/Jatin).
