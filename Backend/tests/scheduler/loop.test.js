import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { MonitorScheduler } from '../../src/jobs/scheduler.js';

/**
 * Scheduler LOOP cadence, driven by fake timers.
 *
 * This suite deliberately never touches the database. Interval accuracy is a
 * property of the timer loop, and mixing fake timers with real async I/O
 * produces tests that are slow and flaky without proving anything extra — a
 * pending mongo operation cannot settle while the clock is frozen.
 *
 * So the lock and the tick body are stubbed, the clock is driven explicitly,
 * and what is asserted is exactly the timing contract: one tick per interval,
 * gaps measured BETWEEN ticks, no stacking when a tick runs long.
 *
 * The database-backed behaviour (overlap, flap, breaker) is covered in
 * scheduler.test.js with real timers.
 */
describe('Scheduler loop', () => {
  let scheduler;

  /** A scheduler whose leadership always succeeds and whose tick is inert. */
  const build = (tickMs, tickImpl) => {
    const s = new MonitorScheduler({
      tickMs,
      enabled: true,
      lock: {
        acquire: jest.fn().mockResolvedValue(true),
        release: jest.fn().mockResolvedValue(undefined),
        isLeader: true,
      },
    });
    s.tick = tickImpl ?? jest.fn().mockResolvedValue(undefined);
    return s;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    scheduler = null;
  });

  it('fires the first tick immediately on start', async () => {
    scheduler = build(5000);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    // A scheduler that waited a full interval before its first check would make
    // a freshly deployed instance blind for that long.
    expect(scheduler.tick).toHaveBeenCalledTimes(1);
  });

  it('ticks once per interval', async () => {
    scheduler = build(5000);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    expect(scheduler.tick).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5000);
    expect(scheduler.tick).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(5000);
    expect(scheduler.tick).toHaveBeenCalledTimes(3);
  });

  it('holds accurate cadence over many intervals', async () => {
    scheduler = build(1000);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(10_000);

    // 1 immediate + 10 intervals.
    expect(scheduler.tick).toHaveBeenCalledTimes(11);
  });

  it('does not tick before the interval has elapsed', async () => {
    scheduler = build(5000);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(4999);

    expect(scheduler.tick).toHaveBeenCalledTimes(1);
  });

  it('does NOT stack ticks when one runs longer than the interval', async () => {
    // setInterval would queue a second tick while the first was still running.
    // The self-rescheduling timeout guarantees the gap is measured BETWEEN
    // ticks, so a slow run delays the next one rather than overlapping it.
    let running = 0;
    let maxConcurrent = 0;
    const slowTick = jest.fn(async () => {
      running += 1;
      maxConcurrent = Math.max(maxConcurrent, running);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      running -= 1;
    });

    scheduler = build(1000, slowTick);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(10_000);

    expect(maxConcurrent).toBe(1);
    // Each cycle costs 2500ms of work + 1000ms of gap, so ~10s allows far
    // fewer ticks than the raw interval would suggest.
    expect(slowTick.mock.calls.length).toBeLessThan(5);
  });

  it('keeps ticking after a tick throws', async () => {
    // A transient database blip must not silently stop all monitoring.
    const failing = jest
      .fn()
      .mockRejectedValueOnce(new Error('mongo unavailable'))
      .mockResolvedValue(undefined);

    scheduler = build(1000, failing);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(3000);

    expect(failing.mock.calls.length).toBeGreaterThan(2);
    expect(scheduler.stats.errors).toBeGreaterThanOrEqual(1);
  });

  it('stops ticking after stop()', async () => {
    scheduler = build(1000);
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(2000);
    const before = scheduler.tick.mock.calls.length;

    await scheduler.stop();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(scheduler.tick).toHaveBeenCalledTimes(before);
  });

  it('releases leadership on stop so failover is immediate', async () => {
    scheduler = build(1000);
    scheduler.start();
    await jest.advanceTimersByTimeAsync(0);

    await scheduler.stop();

    // Without an explicit release, a standby would wait out the full lease TTL
    // before taking over — monitoring paused on every deploy.
    expect(scheduler.lock.release).toHaveBeenCalled();
  });

  it('start() is idempotent', async () => {
    scheduler = build(1000);
    scheduler.start();
    scheduler.start();
    scheduler.start();

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(1000);

    // Three loops would triple every target's check rate.
    expect(scheduler.tick).toHaveBeenCalledTimes(2);
  });

  it('stop() is safe to call when not running', async () => {
    scheduler = build(1000);
    await expect(scheduler.stop()).resolves.toBeUndefined();
  });

  it('does not start when disabled by configuration', async () => {
    const { schedulerConfig } =
      await import('../../src/config/scheduler.config.js');
    // SCHEDULER_ENABLED=false in tests/setup.js — the guard must hold.
    expect(schedulerConfig.ENABLED).toBe(false);

    const disabled = new MonitorScheduler({ tickMs: 100 });
    disabled.tick = jest.fn();
    disabled.start();

    await jest.advanceTimersByTimeAsync(1000);
    expect(disabled.tick).not.toHaveBeenCalled();
  });
});
