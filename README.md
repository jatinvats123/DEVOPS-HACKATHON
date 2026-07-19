# 🛡️ WatchTower — Uptime Monitoring with AI & Real-Time Alerts

WatchTower monitors your websites and APIs around the clock, alerts you by
email the second something breaks, uses AI (Mistral) to explain **why** it broke
and **how** to fix it, and streams live status + an AI assistant over WebSockets.

## Features

- 📡 **Uptime monitoring** — periodic HTTP checks with latency & status-code tracking
- 🔁 **Smart retry logic** — triple-checks before declaring downtime (no false alarms)
- 🤖 **AI incident analysis** — summary, root cause, and fix steps for every incident
- 💬 **Real-time AI assistant** — streaming chat (Socket.IO) to debug incidents & monitoring
- ⚡ **Live dashboard** — monitor status/latency and incidents pushed over WebSockets, no refresh
- 📧 **Email alerts** — incident-detected & resolved notifications with downtime duration
- 📊 **Logs & history** — full check history, latency chart, uptime % per monitor
- 🔐 **Full auth** — JWT (httpOnly cookie) + email OTP verification, forgot / reset / change password
- 🧱 **Hardened API** — helmet, rate limiting, CORS, compression, structured logging (winston/morgan)

## Tech stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19, Vite, Tailwind CSS v4, Redux Toolkit, React Router 7, socket.io-client, react-hot-toast |
| Backend   | Node.js, Express 5, Mongoose (MongoDB), Socket.IO, node-cron, nodemailer, winston |
| AI        | Mistral via LangChain (incident analysis + streaming assistant) |
| Realtime  | Socket.IO (cookie-authenticated, per-user rooms) |

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB connection string (Atlas or local)

### 1. Backend
```bash
cd Backend
cp .env.example .env   # then fill in your values
npm install
npm run dev            # http://localhost:8000
```

Required `.env` values:

| Var | Purpose |
|-----|---------|
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRY` | Auth token signing (e.g. `7d`) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email (Gmail address + [App Password](https://myaccount.google.com/apppasswords)) for OTP & alerts |
| `MISTRAL_API_KEY` | AI incident analysis + assistant ([console.mistral.ai](https://console.mistral.ai)) |
| `CORS_ORIGIN` / `FRONTEND_URL` | Frontend origin (comma-separated origins allowed) |

### 2. Frontend
```bash
cd Frontend
npm install
npm run dev            # http://localhost:5173
```

Frontend env (all optional — sensible localhost defaults) lives in `Frontend/.env`
(`VITE_BACKEND_URL`, `VITE_SOCKET_URL`, per-endpoint overrides).

### Docker (production images)
```bash
docker compose up --build
# frontend → http://localhost:5173  (nginx-served static build)
# backend  → http://localhost:8000
```
Backend secrets are read from `Backend/.env`. The frontend is built to static
assets and served by nginx with SPA routing.

## Real-time layer

Socket.IO shares the REST API's JWT cookie for auth and joins each socket to a
`user:<id>` room. Events:

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:message` | client → server | `{ message, history[] }` |
| `chat:chunk` / `chat:reply` | server → client | streamed AI tokens / final reply |
| `chat:typing` | server → client | boolean |
| `monitor:update` | server → client | live status/latency after each check |
| `incident:new` / `incident:resolved` | server → client | incident lifecycle |

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (sends OTP email) |
| POST | `/api/auth/verify/:id` | Verify email with OTP |
| POST | `/api/auth/login` / `logout` | Session (httpOnly cookie) |
| GET  | `/api/auth/profile` | Current user |
| POST | `/api/auth/forgot-password` | Email a reset link |
| POST | `/api/auth/reset-password/:token` | Set new password |
| POST | `/api/auth/change-password` | Change password (auth) |
| POST/GET | `/api/monitor` | Create / list monitors |
| DELETE | `/api/monitor/:monitorId` | Delete a monitor |
| GET  | `/api/logs/:monitorId` | Check logs |
| GET  | `/api/incidents/:monitorId` | Incidents |
| GET  | `/api/health` | Health check |

## How monitoring works

A cron job wakes every 10s, finds monitors due for a check (per-monitor
`interval`), and hits their URL. A failing check is retried 3× before the
monitor is marked DOWN; that opens an incident, requests an AI analysis, emails
the owner, and pushes a live event. On recovery the same incident is resolved
(with downtime duration) and a recovery email + event are sent.
