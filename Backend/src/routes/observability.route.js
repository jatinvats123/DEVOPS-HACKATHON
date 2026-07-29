import express from 'express';
import { registry, syncSchedulerGauges } from '../observability/metrics.js';
import { getSchedulerStats } from '../jobs/scheduler.js';
import logger from '../config/logger.js';

const observabilityRouter = express.Router();

/**
 * Optional bearer-token protection for /metrics.
 *
 * Metrics are not secrets, but they are reconnaissance: request rates, error
 * rates, deploy timing and how many customers are being monitored. Prometheus
 * supports bearer auth natively, so protecting the endpoint costs one scrape
 * config line.
 *
 * Left OPEN when METRICS_TOKEN is unset, because a metrics endpoint that
 * returns 401 to an unconfigured scraper looks identical to a service that is
 * down, and operators debug that for an hour before finding the cause. A
 * warning at scrape time in production is the honest middle ground.
 */
let warnedAboutOpenMetrics = false;

const requireMetricsToken = (req, res, next) => {
  const expected = process.env.METRICS_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === 'production' && !warnedAboutOpenMetrics) {
      warnedAboutOpenMetrics = true;
      logger.warn(
        '[metrics] /metrics is publicly reachable — set METRICS_TOKEN to require a bearer token'
      );
    }
    return next();
  }

  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (provided !== expected) {
    return res.status(401).type('text/plain').send('unauthorized\n');
  }
  return next();
};

/*
@route GET /metrics
@desc Prometheus exposition. Mounted at the ROOT, not under /api, because that
      is where scrapers expect it and because it is an operational surface
      rather than part of the product API.
@access Public, or bearer-token protected when METRICS_TOKEN is set
*/
observabilityRouter.get('/metrics', requireMetricsToken, async (req, res) => {
  try {
    // Gauges describe "now", so they are refreshed at scrape time rather than
    // by a background timer that exists only to keep numbers warm.
    syncSchedulerGauges(getSchedulerStats());

    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    logger.error(`[metrics] failed to collect: ${err.message}`);
    // Plain text, not the JSON error envelope: a Prometheus scraper parses this
    // body and a JSON payload would produce confusing parse errors in its logs
    // instead of a clean failed scrape.
    res.status(500).type('text/plain').send('# metrics collection failed\n');
  }
});

export default observabilityRouter;
