import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { connectTestDb, disconnectTestDb } from '../helpers/db.js';
import {
  registry,
  resetMetrics,
  checksExecutedTotal,
  checkDurationSeconds,
  incidentsOpenedTotal,
  notificationFailuresTotal,
  schedulerLagSeconds,
  syncSchedulerGauges,
} from '../../src/observability/metrics.js';

/**
 * Prometheus exposition.
 *
 * "How do you monitor your monitoring system?" — a scheduler that silently
 * stops ticking looks, from outside, exactly like a period when nothing broke.
 * These metrics are what makes that distinguishable.
 */
describe('Metrics endpoint', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(resetMetrics);

  afterEach(() => {
    delete process.env.METRICS_TOKEN;
  });

  const scrape = () => request(app).get('/metrics');

  it('serves Prometheus text exposition', async () => {
    const res = await scrape().expect(200);

    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('# HELP');
    expect(res.text).toContain('# TYPE');
  });

  it('is mounted at the root, not under /api', async () => {
    // Where scrapers look by convention. /api/metrics is the tenant-facing
    // uptime/latency API and has no collection route, so it 404s rather than
    // colliding with the scrape endpoint.
    await request(app).get('/metrics').expect(200);
    await request(app).get('/api/metrics').expect(404);
  });

  it('is not swallowed by the SPA fallback', async () => {
    const res = await scrape().expect(200);
    expect(res.text).not.toContain('<!doctype html>');
  });

  it('exposes default Node process metrics', async () => {
    const res = await scrape().expect(200);

    // Event loop lag and heap are the first things to look at when the API is
    // slow but the database is fine.
    expect(res.text).toMatch(
      /watchtower_process_cpu_user_seconds_total|watchtower_nodejs_eventloop_lag_seconds/
    );
  });

  describe('product metrics', () => {
    it('exposes every metric the runbook alerts on', async () => {
      // Increment first: prom-client only emits a labelled series once it has a
      // value, so a scrape of an untouched counter proves nothing.
      checksExecutedTotal.inc({ status: 'UP' });
      checkDurationSeconds.observe({ status: 'UP' }, 0.25);
      incidentsOpenedTotal.inc();
      notificationFailuresTotal.inc({ channel: 'Email' });
      schedulerLagSeconds.set(12);

      const res = await scrape().expect(200);

      for (const metric of [
        'watchtower_checks_executed_total',
        'watchtower_check_duration_seconds',
        'watchtower_incidents_opened_total',
        'watchtower_notification_failures_total',
        'watchtower_scheduler_lag_seconds',
      ]) {
        expect(res.text).toContain(metric);
      }
    });

    it('records check outcomes by status', async () => {
      checksExecutedTotal.inc({ status: 'UP' });
      checksExecutedTotal.inc({ status: 'UP' });
      checksExecutedTotal.inc({ status: 'DOWN' });

      const res = await scrape().expect(200);

      expect(res.text).toMatch(
        /watchtower_checks_executed_total\{[^}]*status="UP"[^}]*\} 2/
      );
      expect(res.text).toMatch(
        /watchtower_checks_executed_total\{[^}]*status="DOWN"[^}]*\} 1/
      );
    });

    it('exposes check duration as a histogram with buckets', async () => {
      checkDurationSeconds.observe({ status: 'UP' }, 0.3);

      const res = await scrape().expect(200);

      expect(res.text).toContain('watchtower_check_duration_seconds_bucket');
      expect(res.text).toContain('watchtower_check_duration_seconds_sum');
      expect(res.text).toContain('watchtower_check_duration_seconds_count');
    });

    it('counts notification failures separately from attempts', async () => {
      // A failed notification means the customer was never told — the most
      // consequential failure in the system, so it gets its own counter rather
      // than being inferred from log volume.
      notificationFailuresTotal.inc({ channel: 'Email' });
      notificationFailuresTotal.inc({ channel: 'Webhook' });

      const res = await scrape().expect(200);

      expect(res.text).toMatch(
        /watchtower_notification_failures_total\{[^}]*channel="Email"[^}]*\} 1/
      );
      expect(res.text).toMatch(
        /watchtower_notification_failures_total\{[^}]*channel="Webhook"[^}]*\} 1/
      );
    });

    it('records HTTP metrics labelled by route PATTERN, not raw path', async () => {
      // Raw paths would create one time series per monitor id — unbounded
      // cardinality is the standard way to take down a Prometheus server with
      // your own instrumentation.
      await request(app).get('/api/health');

      const res = await scrape().expect(200);
      expect(res.text).toContain('watchtower_http_requests_total');
      expect(res.text).not.toMatch(/route="\/api\/monitor\/[0-9a-f]{24}"/);
    });
  });

  describe('scheduler gauges', () => {
    it('reflects a stats snapshot at scrape time', async () => {
      syncSchedulerGauges({
        isLeader: true,
        inFlight: 3,
        maxLagMs: 4500,
        lastTickAt: new Date(),
      });

      const metrics = await registry.metrics();

      expect(metrics).toMatch(/watchtower_scheduler_is_leader\{[^}]*\} 1/);
      expect(metrics).toMatch(
        /watchtower_scheduler_inflight_checks\{[^}]*\} 3/
      );
      expect(metrics).toMatch(/watchtower_scheduler_lag_seconds\{[^}]*\} 4.5/);
    });

    it('tolerates a missing stats object', () => {
      expect(() => syncSchedulerGauges(undefined)).not.toThrow();
    });
  });

  describe('access control', () => {
    it('is open when METRICS_TOKEN is unset', async () => {
      // A metrics endpoint that 401s at an unconfigured scraper is
      // indistinguishable from a service that is down.
      await scrape().expect(200);
    });

    it('requires a bearer token when METRICS_TOKEN is set', async () => {
      process.env.METRICS_TOKEN = 'scrape-me';

      await scrape().expect(401);
      await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer wrong-token')
        .expect(401);
      await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer scrape-me')
        .expect(200);
    });
  });
});
