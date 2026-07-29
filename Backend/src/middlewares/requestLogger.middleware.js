import pinoHttp from 'pino-http';
import logger from '../config/logger.js';
import {
  runWithRequestContext,
  normaliseRequestId,
} from '../observability/requestContext.js';
import {
  httpRequestDuration,
  httpRequestsTotal,
} from '../observability/metrics.js';

/**
 * Request correlation, access logging and HTTP metrics.
 *
 * Replaces morgan, which produced unstructured text with no request id — fine
 * to watch scroll past in a terminal, useless for answering "what happened to
 * the request that 500'd at 03:14?".
 */

/** Assign a request id and make it visible to every downstream log line. */
export const requestContextMiddleware = (req, res, next) => {
  const requestId = normaliseRequestId(
    req.headers['x-request-id'] || req.headers['x-correlation-id']
  );

  req.id = requestId;
  // Echo it back so a user reporting a problem can quote an id that appears in
  // our logs — the difference between a bug report and a search.
  res.setHeader('X-Request-Id', requestId);

  runWithRequestContext({ requestId }, () => next());
};

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,

  // Health and metrics are polled constantly by the platform and by Prometheus.
  // Logging them buries real traffic and inflates log costs for zero signal.
  autoLogging: {
    ignore: (req) =>
      req.url === '/metrics' ||
      req.url === '/api/health' ||
      req.url === '/api/health/ready',
  },

  // A 4xx is the client's problem and expected traffic; a 5xx is ours.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'http';
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,

  serializers: {
    // Default serialisers dump every header on every line. Keep what is useful
    // for debugging and drop the rest — cookie and authorization would be
    // redacted anyway, but not logging them at all is cheaper and safer.
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

/**
 * Record HTTP latency and outcome for Prometheus.
 *
 * Routes are labelled by their PATTERN (`/api/monitor/:monitorId`), never the
 * raw path. Using the raw path would create a distinct time series per monitor
 * id — unbounded cardinality, which is the classic way to take down a
 * Prometheus server with your own instrumentation.
 */
export const httpMetricsMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;

    // req.route is only populated once a route has matched; fall back to a
    // constant so unmatched requests cannot spawn a series per 404 URL.
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.baseUrl || 'unmatched';

    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, seconds);
  });

  next();
};
