import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createUser, createMonitor } from '../helpers/factories.js';
import logModel from '../../src/models/logs.model.js';
import { getUptimeWindows } from '../../src/services/uptime.service.js';

/**
 * Windowed uptime aggregation.
 *
 * Seeds a KNOWN check history and asserts the computed percentage, so the
 * arithmetic is pinned rather than merely "returning a number". Everything is
 * computed by a single $facet inside MongoDB — the previous implementation
 * grouped a monitor's entire history with no time bound and reported one
 * all-time figure.
 */
describe('Uptime aggregation', () => {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  let owner;
  let monitor;
  let now;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    owner = await createUser();
    monitor = await createMonitor(owner.id);
    now = Date.now();
  });

  /** Seed `count` checks at `hoursAgo`, stepping backwards by an hour each. */
  const seed = async ({ status, count, hoursAgo, latency = 100 }) => {
    await logModel.insertMany(
      Array.from({ length: count }, (_, i) => ({
        monitorId: monitor._id,
        status,
        latency,
        statusCode: status === 'UP' ? 200 : 503,
        timestamp: new Date(now - (hoursAgo + i) * HOUR),
      }))
    );
  };

  // `now + 1s` so freshly-seeded rows are unambiguously inside every window.
  const windows = () => getUptimeWindows(monitor._id, new Date(now + 1000));

  it('computes an exact percentage for a known history', async () => {
    await seed({ status: 'UP', count: 9, hoursAgo: 1 });
    await seed({ status: 'DOWN', count: 1, hoursAgo: 11 });

    const result = await windows();
    expect(result['24h'].uptime).toBe(90);
    expect(result['24h'].totalChecks).toBe(10);
    expect(result['24h'].upChecks).toBe(9);
    expect(result['24h'].downChecks).toBe(1);
  });

  it('reports 100 for a perfect window', async () => {
    await seed({ status: 'UP', count: 5, hoursAgo: 1 });
    expect((await windows())['24h'].uptime).toBe(100);
  });

  it('reports 0 for a wholly failed window', async () => {
    await seed({ status: 'DOWN', count: 4, hoursAgo: 1 });
    expect((await windows())['24h'].uptime).toBe(0);
  });

  it('reports null — NOT 100 — when a window has no data', async () => {
    const result = await windows();

    // "We never checked" and "it was perfectly healthy" are different claims.
    // Conflating them is how a monitoring dashboard learns to lie.
    expect(result['24h'].uptime).toBeNull();
    expect(result['7d'].uptime).toBeNull();
    expect(result['30d'].uptime).toBeNull();
    expect(result['24h'].totalChecks).toBe(0);
  });

  it('scopes each window independently and cumulatively', async () => {
    // 24h: 9 UP + 1 DOWN                       -> 90%
    await seed({ status: 'UP', count: 9, hoursAgo: 1 });
    await seed({ status: 'DOWN', count: 1, hoursAgo: 11 });
    // +10 UP inside 7d but outside 24h         -> 7d = 19/20 = 95%
    await seed({ status: 'UP', count: 10, hoursAgo: 48 });
    // +20 UP inside 30d but outside 7d         -> 30d = 39/40 = 97.5%
    await logModel.insertMany(
      Array.from({ length: 20 }, (_, i) => ({
        monitorId: monitor._id,
        status: 'UP',
        latency: 130,
        timestamp: new Date(now - (8 + i) * DAY),
      }))
    );

    const result = await windows();
    expect(result['24h'].uptime).toBe(90);
    expect(result['7d'].uptime).toBe(95);
    expect(result['30d'].uptime).toBe(97.5);
  });

  it('excludes checks older than the widest window', async () => {
    await seed({ status: 'UP', count: 3, hoursAgo: 1 });
    await logModel.create({
      monitorId: monitor._id,
      status: 'DOWN',
      latency: 5000,
      timestamp: new Date(now - 90 * DAY), // ancient
    });

    const result = await windows();
    // An outage three months ago must not drag down today's figure.
    expect(result['30d'].uptime).toBe(100);
    expect(result['30d'].totalChecks).toBe(3);
  });

  it('averages latency over SUCCESSFUL checks only', async () => {
    await seed({ status: 'UP', count: 3, hoursAgo: 1, latency: 100 });
    await seed({ status: 'DOWN', count: 1, hoursAgo: 5, latency: 10000 });

    // Mixing "responded in 100ms" with "timed out after 10s" produces a number
    // that describes neither.
    expect((await windows())['24h'].avgLatencyMs).toBe(100);
  });

  it("never counts another monitor's checks", async () => {
    const other = await createMonitor(owner.id, {
      url: 'https://other.example.test',
    });
    await seed({ status: 'UP', count: 2, hoursAgo: 1 });
    await logModel.insertMany(
      Array.from({ length: 50 }, () => ({
        monitorId: other._id,
        status: 'DOWN',
        latency: 900,
        timestamp: new Date(now - HOUR),
      }))
    );

    const result = await windows();
    expect(result['24h'].totalChecks).toBe(2);
    expect(result['24h'].uptime).toBe(100);
  });

  it('rounds to three decimal places rather than truncating', async () => {
    // 2 of 3 up = 66.666...%
    await seed({ status: 'UP', count: 2, hoursAgo: 1 });
    await seed({ status: 'DOWN', count: 1, hoursAgo: 4 });

    expect((await windows())['24h'].uptime).toBe(66.667);
  });

  it('reports the most recent check time per window', async () => {
    await seed({ status: 'UP', count: 3, hoursAgo: 1 });
    const result = await windows();
    expect(result['24h'].lastCheckAt).toBeInstanceOf(Date);
    expect(result['24h'].lastCheckAt.getTime()).toBeLessThanOrEqual(now);
  });

  it('exposes the window start so a client can label the range', async () => {
    const result = await windows();
    const spread = now - result['24h'].windowStart.getTime();
    expect(spread).toBeGreaterThan(23 * HOUR);
    expect(spread).toBeLessThan(25 * HOUR);
  });
});
