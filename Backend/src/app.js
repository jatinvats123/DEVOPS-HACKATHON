import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './config/logger.js';
import HealthRouter from './routes/health.route.js';
import UserRouter from './routes/user.routes.js';
import MonitorRouter from './routes/monitor.route.js';
import Middleware from './app.middleware.js';
import LogsRouter from './routes/logs.route.js';
import IncidentRouter from './routes/incident.route.js';
import metricsRouter from './routes/metrics.route.js';
import ChannelRouter from './routes/channel.route.js';
import {
  StatusPageRouter,
  PublicStatusRouter,
} from './routes/statusPage.route.js';
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
app.use('/api/status-pages', StatusPageRouter);

// Public, unauthenticated status pages. Mounted under /api/status (not
// /api/status-pages) so the authenticated management surface and the world-
// readable one never share a path prefix — it should be impossible to add a
// route to one and accidentally expose it through the other.
app.use('/api/status', PublicStatusRouter);

// Unknown API routes must return JSON, never the SPA shell
app.use('/api', (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

const spaIndex = path.join(distDir, 'index.html');

/**
 * Has the SPA actually been built into public/dist?
 *
 * The bundle is deliberately NOT committed to git — it is a build artefact, and
 * committing it means every rebuild adds orphaned hash-named files forever. The
 * consequence is that the deployment's build step MUST run `npm run build`, and
 * if it does not, this directory is simply empty.
 *
 * That failure used to be silent and cryptic: `sendFile` errored, called
 * `next()`, nothing matched, and Express replied with its default
 * `Cannot GET /`. Which looks like a routing bug, sends you into the router,
 * and tells you nothing about the actual cause.
 *
 * Re-checked while missing rather than cached, so a build finishing after the
 * process started (local development) is picked up without a restart. Once
 * found it is cached, because the common case must not stat the filesystem on
 * every request.
 */
let spaFound = fs.existsSync(spaIndex);
const isSpaBuilt = () => {
  if (spaFound) return true;
  spaFound = fs.existsSync(spaIndex);
  return spaFound;
};

if (!spaFound) {
  logger.error(
    `[startup] SPA bundle not found at ${spaIndex}. The API will work but no page will render. ` +
      'The deployment build step must run "npm run install:all && npm run build" ' +
      '(see render.yaml). Requests to non-API routes will return 503 with an explanation.'
  );
}

// SPA fallback: let React Router handle client-side routes on direct
// navigation / refresh (e.g. /dashboard) instead of returning 404.
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (!isSpaBuilt()) {
    // 503, not 404: the route is valid, the server is simply not able to serve
    // it yet. A 404 would suggest the URL is wrong, which it is not.
    return res.status(503).type('html').set('Cache-Control', 'no-store')
      .send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>WatchTower — frontend not built</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font:16px/1.6 system-ui,sans-serif;margin:0;padding:2rem;background:#faf9f5;color:#141413}
  main{max-width:44rem;margin:0 auto}
  code,pre{background:#f1f0ed;border:1px solid #e6dfd8;border-radius:6px}
  code{padding:.1rem .35rem}
  pre{padding:1rem;overflow-x:auto}
  .ok{color:#1c6b3f}
</style></head>
<body><main>
  <h1>The frontend has not been built</h1>
  <p>The API is running correctly — <a href="/api/health">/api/health</a> responds
     and <a href="/api/docs">/api/docs</a> is available. What is missing is the
     compiled React bundle, which the server expects at
     <code>Backend/public/dist</code>.</p>
  <p>The bundle is a build artefact and is intentionally not committed to git, so
     the deployment's <strong>build command</strong> has to produce it:</p>
  <pre>npm run install:all &amp;&amp; npm run build</pre>
  <p>On Render, set that as the service's Build Command (Settings → Build &amp;
     Deploy), or link the service to the <code>render.yaml</code> blueprint in
     the repository, which already specifies it. Then redeploy.</p>
  <p class="ok">No data has been lost and nothing needs reconfiguring beyond the
     build command.</p>
</main></body></html>`);
  }

  // Same rule as the static handler: the shell must never be cached, or a
  // returning visitor loads an old index.html referencing asset hashes that no
  // longer exist and sees a blank page.
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(spaIndex, (err) => {
    if (err) next();
  });
});

// Central error handler (must be registered last)
app.use(errorMiddleware);

export default app;
