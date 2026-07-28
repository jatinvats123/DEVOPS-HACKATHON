import { describe, it, expect } from '@jest/globals';
import { runPool } from '../../src/utils/pool.js';

/**
 * Bounded-concurrency runner.
 *
 * Replaces an uncapped `Promise.all` over every monitor in the database, which
 * issued one simultaneous HTTP request per monitor — fine with ten, a
 * self-inflicted outage with ten thousand.
 */
describe('runPool', () => {
  /** Runs `count` tasks and reports the highest observed concurrency. */
  const measurePeak = async (count, limit, taskMs = 10) => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: count }, () => async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, taskMs));
      active -= 1;
    });
    await runPool(tasks, limit);
    return peak;
  };

  it('never exceeds the concurrency limit', async () => {
    expect(await measurePeak(30, 4)).toBeLessThanOrEqual(4);
  });

  it('actually uses the full width available', async () => {
    // A limit that is silently capped at 1 would still "not exceed" the limit,
    // so assert it genuinely parallelises.
    expect(await measurePeak(30, 5)).toBe(5);
  });

  it('runs every task exactly once', async () => {
    let calls = 0;
    const tasks = Array.from({ length: 25 }, () => async () => {
      calls += 1;
      return calls;
    });

    const results = await runPool(tasks, 4);
    expect(calls).toBe(25);
    expect(results).toHaveLength(25);
  });

  it('preserves result order regardless of completion order', async () => {
    const tasks = [
      async () => {
        await new Promise((r) => setTimeout(r, 30));
        return 'slow-first';
      },
      async () => 'fast-second',
    ];

    const results = await runPool(tasks, 2);
    expect(results[0].value).toBe('slow-first');
    expect(results[1].value).toBe('fast-second');
  });

  it('isolates failures so one bad task cannot abort the batch', async () => {
    // Promise.all would reject the whole batch here and lose every other check.
    const tasks = [
      async () => 'a',
      async () => {
        throw new Error('this one exploded');
      },
      async () => 'c',
    ];

    const results = await runPool(tasks, 2);
    expect(results[0]).toEqual({ ok: true, value: 'a' });
    expect(results[1].ok).toBe(false);
    expect(results[1].error.message).toBe('this one exploded');
    expect(results[2]).toEqual({ ok: true, value: 'c' });
  });

  it('handles an empty task list', async () => {
    expect(await runPool([], 4)).toEqual([]);
  });

  it('clamps a limit larger than the task count', async () => {
    expect(await measurePeak(3, 100)).toBeLessThanOrEqual(3);
  });

  it('still makes progress with a limit below 1', async () => {
    // A misconfigured concurrency of 0 must not deadlock the scheduler.
    const tasks = Array.from({ length: 3 }, () => async () => 'done');
    const results = await runPool(tasks, 0);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
  });
});
