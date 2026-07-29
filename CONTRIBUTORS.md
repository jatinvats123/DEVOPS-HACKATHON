# Contributors

WatchTower was built in a four-person hackathon (28 April – 4 May 2026) and
subsequently rebuilt for production by a single maintainer.

The split below is not an estimate. It was derived from the git history —
`git shortlog`, per-author file paths, and commit subjects — and anyone can
reproduce it:

```bash
git shortlog -sne --all
git log --all --author="<email>" --name-only --pretty=format:
```

---

## Team

| Contributor | Commits | Active | Focus |
|---|---:|---|---|
| **[Jatin Vats](https://github.com/jatinvats123)** — *project lead & maintainer* | 84 | 28 Apr – ongoing | Real-time layer, full production rebuild |
| [Gaurav Anmulwad](https://github.com/anmulwadgaurav) | 49 | 1 – 4 May | Monitoring domain & backend API |
| [Satyajit Das Mahapatra](https://github.com/bitun123) | 29 | 29 Apr – 4 May | Frontend auth & state management |
| [Rajiv Kumar](https://github.com/rajivkr8207) | 23 | 29 Apr – 4 May | Backend scaffolding & integration fixes |

---

## Jatin Vats — project lead and maintainer

**Hackathon.** Frontend application shell and routing, styling system, parts of
the API service layer, and several backend controllers.

**Post-hackathon.** Designed and delivered the real-time Socket.IO layer and the
AI assistant, then carried out the entire production rebuild alone — every
commit from 28 July onward is mine. That work is the substance of this
repository as it now stands:

- **Monitoring core.** Replaced a single-process `node-cron` tick with a
  scheduler that survives restart, skips overlapping checks, tolerates clock
  drift, and coordinates across instances with a MongoDB TTL lease lock. Added
  per-check timeouts, jittered exponential backoff, a per-monitor circuit
  breaker, and configurable flap detection. Rewrote the HTTP probe on
  `node:http` to capture real DNS/TCP/TLS/TTFB timings, and re-enabled the TLS
  certificate validation that had been globally disabled.
- **Security and multi-tenancy.** Built the owner-scoped DAO layer that makes an
  unscoped query throw rather than silently return every tenant's data,
  authorised the Socket.IO handshake with per-tenant rooms, added request
  sanitisation and tiered rate limiting, and encrypted outbound monitor
  credentials at rest (AES-256-GCM).
- **Testing.** 314 tests from zero, with a 60% coverage gate enforced in CI.
- **CI/CD.** Lint, matrix tests, dependency-audit gate, Trivy scans, image
  builds and a compose-based integration smoke test; deploy with post-deploy
  health check and automatic rollback. Rewrote both Dockerfiles as multi-stage,
  non-root, with working signal handling.
- **Observability.** Structured logging with request correlation and secret
  redaction, liveness/readiness endpoints, Prometheus metrics, and the runbook.
- **Frontend.** Route-level code splitting, error boundaries, reconnection with
  state resync, and WCAG AA compliance (Lighthouse accessibility 92 → 100).

Full detail in [`docs/PRODUCTION-READINESS.md`](docs/PRODUCTION-READINESS.md).

## Gaurav Anmulwad — monitoring domain and backend API

Owned most of the backend domain model during the hackathon: the `Monitor` and
`Incident` schemas, the monitor / incident / metrics routes and controllers, and
the original scheduled check loop including incident open-and-resolve logic.
Also added the auth middleware, the monitor validators, and the environment
variable checks in `config.js`.

The metrics endpoints (latency, uptime, status timeline) and the incident
lifecycle concept are his design; both were substantially reworked later, but
the domain shape they established is still the one the product uses.

## Satyajit Das Mahapatra — frontend auth and state management

Built the authentication experience end to end: the `useAuth` hook, the Redux
auth slice, the API layer, login and registration screens, protected routes, and
the forgot / change password flows. Also built the monitoring state management
(Redux slices and hooks for monitors, logs and status), the `AddMonitoring`
form, and the shared `apiRequest` utility that standardised API calls across the
frontend.

Wrote the initial Express server setup and the validation middleware.

## Rajiv Kumar — backend scaffolding and integration

Created the initial backend scaffolding — `server.js`, package configuration,
the first Dockerfile, ESLint config, `.env.example` — and the original `User`
model, the earliest domain file in the repository. Set up the first Socket.IO
integration.

Spent most of the hackathon on integration work: fixing auth, dashboard, logs
and socket issues across the frontend/backend boundary, and a joint
frontend/backend redesign pass near the end.

---

## A note on this file

It would be easy to write a contributors file that quietly implies one person
built everything. Three people wrote the domain model, the authentication flow
and the scaffolding this project stands on, in four days, and that work is still
here.

What changed afterwards is scope rather than authorship: a hackathon
prototype became something that could be deployed and operated. Both facts
belong in the record.
