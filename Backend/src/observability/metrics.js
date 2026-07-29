import client from 'prom-client';

/**
 * Prometheus instrumentation — "how do you monitor your monitoring system?"
 *
 * WatchTower tells customers when their services break. Nothing told us when
 * WatchTower broke. A scheduler that silently stopped ticking, or a notifier
 * that failed every send, looked identical from the outside to a period where
 * nothing happened to be wrong — which is the worst possible failure mode for
 * this product specifically: it fails *silent*, and silence is exactly what a
 * healthy monitoring system also looks like.
 *
 * Cardinality rule applied throughout: labels are bounded sets (status, method,
 * route pattern, outcome). Never a monitor id, user id or raw URL — each
 * distinct label combination is a separate stored time series, and unbounded
 * labels are the standard way teams take down their own Prometheus.
 */

export const registry = new client.Registry();

registry.setDefaultLabels({
  service: 'watchtower-api',
  env: process.env.NODE_ENV || 'development',
});

// Event loop lag, heap, GC, handles. Cheap, and the first place to look when
// the API is slow but the database is fine.
client.collectDefaultMetrics({
  register: registry,
  prefix: 'watchtower_',
});

const register = (metric) => {
  registry.registerMetric(metric);
  return metric;
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export const httpRequestsTotal = register(
  new client.Counter({
    name: 'watchtower_http_requests_total',
    help: 'HTTP requests handled, by method, route pattern and status.',
    labelNames: ['method', 'route', 'status'],
  })
);

export const httpRequestDuration = register(
  new client.Histogram({
    name: 'watchtower_http_request_duration_seconds',
    help: 'HTTP request latency in seconds.',
    labelNames: ['method', 'route', 'status'],
    // Weighted towards the fast end: an API where p95 is 2s is already broken,
    // so resolution above that adds nothing actionable.
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  })
);

// ---------------------------------------------------------------------------
// Scheduler — the product's actual work
// ---------------------------------------------------------------------------

export const checksExecutedTotal = register(
  new client.Counter({
    name: 'watchtower_checks_executed_total',
    help: 'Monitor checks executed, by resulting status.',
    labelNames: ['status'], // UP | DOWN
  })
);

export const checkDurationSeconds = register(
  new client.Histogram({
    name: 'watchtower_check_duration_seconds',
    help: 'Wall-clock duration of a monitor check, including its retry ladder.',
    labelNames: ['status'],
    // Reaches 30s because a check's ceiling is the monitor's timeout, and slow
    // checks are the interesting ones — a bucket set that tops out at 1s would
    // lump "2s" and "timed out" together.
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30],
  })
);

export const checksSkippedTotal = register(
  new client.Counter({
    name: 'watchtower_checks_skipped_total',
    help: 'Checks that were due but not run.',
    labelNames: ['reason'], // overlap | breaker_open
  })
);

export const schedulerLagSeconds = register(
  new client.Gauge({
    name: 'watchtower_scheduler_lag_seconds',
    help: 'How overdue the most overdue due monitor was on the last tick.',
  })
);

export const schedulerTickDurationSeconds = register(
  new client.Histogram({
    name: 'watchtower_scheduler_tick_duration_seconds',
    help: 'Duration of one scheduler tick.',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30],
  })
);

export const schedulerLastTickTimestamp = register(
  new client.Gauge({
    name: 'watchtower_scheduler_last_tick_timestamp_seconds',
    help: 'Unix timestamp of the last completed scheduler tick.',
  })
);

export const schedulerIsLeader = register(
  new client.Gauge({
    name: 'watchtower_scheduler_is_leader',
    help: 'Whether this instance currently holds the scheduler lease (1/0).',
  })
);

export const schedulerInFlightChecks = register(
  new client.Gauge({
    name: 'watchtower_scheduler_inflight_checks',
    help: 'Checks currently executing.',
  })
);

// ---------------------------------------------------------------------------
// Incidents and notifications
// ---------------------------------------------------------------------------

export const incidentsOpenedTotal = register(
  new client.Counter({
    name: 'watchtower_incidents_opened_total',
    help: 'Incidents opened.',
  })
);

export const incidentsClosedTotal = register(
  new client.Counter({
    name: 'watchtower_incidents_closed_total',
    help: 'Incidents resolved.',
  })
);

export const notificationsTotal = register(
  new client.Counter({
    name: 'watchtower_notifications_total',
    help: 'Notification dispatch attempts, by channel and outcome.',
    labelNames: ['channel', 'status'], // Delivered | Failed | Skipped
  })
);

export const notificationFailuresTotal = register(
  new client.Counter({
    name: 'watchtower_notification_failures_total',
    help: 'Notification dispatches that failed. The metric that matters most: a customer whose alert never arrived did not get monitored.',
    labelNames: ['channel'],
  })
);

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export const mongoUp = register(
  new client.Gauge({
    name: 'watchtower_mongodb_up',
    help: 'Whether the last MongoDB readiness probe succeeded (1/0).',
  })
);

/**
 * Seed every labelled series with zero at startup.
 *
 * prom-client only emits a labelled series once it has been touched, so a fresh
 * process exposes no `watchtower_notification_failures_total` at all until the
 * first failure occurs. That is a genuine operational problem, not cosmetic:
 *
 *  - dashboards render "No data" rather than a flat zero line, which reads as
 *    "instrumentation is broken" during exactly the calm period you want to be
 *    able to trust;
 *  - `rate()` and `increase()` have no baseline to work from until the metric
 *    first appears, so the alert intended to fire on the FIRST failure is the
 *    one least likely to behave predictably.
 *
 * Only bounded, known-ahead-of-time label values are seeded — the same
 * cardinality rule as everywhere else.
 */
export function initialiseMetrics() {
  for (const status of ['UP', 'DOWN']) {
    checksExecutedTotal.inc({ status }, 0);
    checkDurationSeconds.zero?.({ status });
  }

  for (const reason of ['overlap', 'breaker_open']) {
    checksSkippedTotal.inc({ reason }, 0);
  }

  for (const channel of ['Email', 'Webhook', 'Slack']) {
    notificationFailuresTotal.inc({ channel }, 0);
    for (const status of ['Delivered', 'Failed', 'Skipped']) {
      notificationsTotal.inc({ channel, status }, 0);
    }
  }
}

/**
 * Reflect a scheduler stats snapshot into the gauges.
 *
 * Called when /metrics is scraped rather than on a timer: gauges describe
 * "now", and computing them on demand avoids a background interval that exists
 * only to keep numbers warm.
 */
export function syncSchedulerGauges(stats) {
  if (!stats) return;
  schedulerIsLeader.set(stats.isLeader ? 1 : 0);
  schedulerInFlightChecks.set(stats.inFlight ?? 0);
  schedulerLagSeconds.set((stats.maxLagMs ?? 0) / 1000);
  if (stats.lastTickAt) {
    schedulerLastTickTimestamp.set(new Date(stats.lastTickAt).getTime() / 1000);
  }
}

/** Test helper — counters are process-global and would leak between cases. */
export function resetMetrics() {
  registry.resetMetrics();
  // Re-seed so tests observe the same starting shape as a fresh process.
  initialiseMetrics();
}

// Seeded at module load so the very first scrape of a new process already
// reports zeroes rather than omitting the series entirely.
initialiseMetrics();

export default registry;
