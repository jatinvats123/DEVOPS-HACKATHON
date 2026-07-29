import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  jest,
} from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { connectTestDb, disconnectTestDb } from '../helpers/db.js';
import { scheduler } from '../../src/jobs/scheduler.js';
import { schedulerConfig } from '../../src/config/scheduler.config.js';
import { normaliseRequestId } from '../../src/observability/requestContext.js';

/**
 * `readyState` is a non-configurable prototype getter on the mongoose
 * Connection, so jest.spyOn cannot wrap it. Shadowing it with a configurable
 * own-property and deleting that afterwards restores the original getter.
 */
const forceReadyState = (value) =>
  Object.defineProperty(mongoose.connection, 'readyState', {
    value,
    configurable: true,
    writable: true,
  });

const restoreReadyState = () => {
  delete mongoose.connection.readyState;
};

/** schedulerConfig is a plain object, so this is assignment, not spying. */
const withSchedulerEnabled = (enabled) => {
  const previous = schedulerConfig.ENABLED;
  schedulerConfig.ENABLED = enabled;
  return () => {
    schedulerConfig.ENABLED = previous;
  };
};

/**
 * Liveness and readiness.
 *
 * The distinction is the whole point: liveness must never touch a dependency,
 * because a liveness probe that fails during a database outage makes the
 * orchestrator restart every replica and converts a recoverable failure into a
 * crash loop.
 */
describe('Health endpoints', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  afterEach(() => {
    jest.restoreAllMocks();
    restoreReadyState();
    scheduler.stats.lastTickAt = null;
    scheduler.stats.isLeader = false;
  });

  describe('GET /api/health (liveness)', () => {
    it('returns 200 with uptime', async () => {
      const res = await request(app).get('/api/health').expect(200);

      expect(res.body.data.status).toBe('ok');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.body.data.timestamp).toBeTruthy();
    });

    it('stays 200 even when MongoDB is unreachable', async () => {
      // The critical property. If this returned 503, a database blip would
      // trigger a restart of every replica.
      forceReadyState(0);

      await request(app).get('/api/health').expect(200);
    });

    it('does not require authentication', async () => {
      await request(app).get('/api/health').expect(200);
    });
  });

  describe('GET /api/health/ready (readiness)', () => {
    it('reports ready when MongoDB responds', async () => {
      const res = await request(app).get('/api/health/ready').expect(200);

      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.mongodb.status).toBe('up');
      expect(typeof res.body.data.checks.mongodb.latencyMs).toBe('number');
    });

    it('returns 503 when the MongoDB connection is down', async () => {
      forceReadyState(0);

      const res = await request(app).get('/api/health/ready').expect(503);

      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.checks.mongodb.status).toBe('down');
      expect(res.body.data.checks.mongodb.detail).toMatch(/disconnected/);
    });

    it('returns 503 when MongoDB is "connected" but a ping fails', async () => {
      // readyState alone is the driver's opinion; a ping is proof. The two
      // diverge exactly during a partition the driver has not noticed.
      jest.spyOn(mongoose.connection.db, 'admin').mockReturnValue({
        ping: async () => {
          throw new Error('connection timed out');
        },
      });

      const res = await request(app).get('/api/health/ready').expect(503);
      expect(res.body.data.checks.mongodb.status).toBe('down');
      expect(res.body.data.checks.mongodb.detail).toMatch(/timed out/);
    });

    it('reports the scheduler as disabled without failing readiness', async () => {
      // SCHEDULER_ENABLED=false in the test env. An API-only instance is not
      // unhealthy for having no ticks.
      expect(schedulerConfig.ENABLED).toBe(false);

      const res = await request(app).get('/api/health/ready').expect(200);
      expect(res.body.data.checks.scheduler.status).toBe('disabled');
    });

    it('reports a stale scheduler and fails readiness', async () => {
      const restoreEnabled = withSchedulerEnabled(true);
      // Older than 5 ticks and older than the 60s floor.
      scheduler.stats.lastTickAt = new Date(Date.now() - 10 * 60 * 1000);

      const res = await request(app).get('/api/health/ready').expect(503);

      expect(res.body.data.checks.scheduler.status).toBe('stale');
      expect(res.body.data.checks.scheduler.lastTickAgeSeconds).toBeGreaterThan(
        300
      );
      restoreEnabled();
    });

    it('reports a fresh scheduler as up', async () => {
      const restoreEnabled = withSchedulerEnabled(true);
      scheduler.stats.lastTickAt = new Date();

      const res = await request(app).get('/api/health/ready').expect(200);

      expect(res.body.data.checks.scheduler.status).toBe('up');
      restoreEnabled();
    });

    it('stays READY while the scheduler is still starting', async () => {
      // A cold instance can serve API traffic before its first tick completes;
      // refusing traffic here would make every deploy slower for no reason.
      const restoreEnabled = withSchedulerEnabled(true);
      scheduler.stats.lastTickAt = null;

      const res = await request(app).get('/api/health/ready').expect(200);

      expect(res.body.data.checks.scheduler.status).toBe('starting');
      restoreEnabled();
    });
  });

  describe('request correlation', () => {
    it('returns an X-Request-Id on every response', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.headers['x-request-id']).toMatch(/^[\w.:-]+$/);
    });

    it('echoes a caller-supplied request id so traces span services', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Request-Id', 'upstream-trace-123')
        .expect(200);

      expect(res.headers['x-request-id']).toBe('upstream-trace-123');
    });

    it('replaces a hostile request id rather than echoing it', () => {
      // Asserted directly rather than over the wire: superagent refuses to
      // transmit a header containing a newline. The sanitiser is still what
      // stops a log-injection payload reaching the log stream, so it is tested
      // at the only layer that can receive one.
      const cleaned = normaliseRequestId(
        'bad value with spaces\nInjected: forged log line'
      );

      expect(cleaned).not.toContain(' ');
      expect(cleaned).not.toContain('\n');
      expect(cleaned).toMatch(/^[\w.:-]+$/);
    });

    it('accepts a well-formed inbound id unchanged', () => {
      expect(normaliseRequestId('trace-abc.123:9')).toBe('trace-abc.123:9');
    });

    it('mints an id when none is supplied', () => {
      expect(normaliseRequestId(undefined)).toMatch(/^[\w-]{36}$/);
    });

    it('caps an over-long request id', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('X-Request-Id', 'a'.repeat(500))
        .expect(200);

      expect(res.headers['x-request-id'].length).toBeLessThanOrEqual(64);
    });

    it('gives different requests different ids', async () => {
      const [a, b] = await Promise.all([
        request(app).get('/api/health'),
        request(app).get('/api/health'),
      ]);

      expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
    });
  });
});
