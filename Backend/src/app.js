import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import HealthRouter from './routes/health.route.js';
import UserRouter from './routes/user.routes.js';
import MonitorRouter from './routes/monitor.route.js';
import Middleware from './app.middleware.js';
import LogsRouter from './routes/logs.route.js';
import IncidentRouter from './routes/incident.route.js';
import metricsRouter from './routes/metrics.route.js';
import ChannelRouter from './routes/channel.route.js';
import observabilityRouter from './routes/observability.route.js';
import docsRouter from './routes/docs.route.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { ApiError } from './utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../public/dist');

const app = express();

Middleware(app);

// Prometheus scrape target. Mounted at the root rather than under /api: it is
// where scrapers look by convention, and it is an operational surface rather
// than part of the product API (which is also why the SPA fallback below must
// not swallow it).
app.use('/', observabilityRouter);

// Mounted before the other /api routes so /api/docs cannot be shadowed, and
// before the /api 404 handler so it is not swallowed by it.
app.use('/api', docsRouter);

app.use('/api/health', HealthRouter);
app.use('/api/auth', UserRouter);
app.use('/api/monitor', MonitorRouter);
app.use('/api/logs', LogsRouter);
app.use('/api/incidents', IncidentRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/channels', ChannelRouter);

// Unknown API routes must return JSON, never the SPA shell
app.use('/api', (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// SPA fallback: let React Router handle client-side routes on direct
// navigation / refresh (e.g. /dashboard) instead of returning 404.
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  // Same rule as the static handler: the shell must never be cached, or a
  // returning visitor loads an old index.html referencing asset hashes that no
  // longer exist and sees a blank page.
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

// Central error handler (must be registered last)
app.use(errorMiddleware);

export default app;
