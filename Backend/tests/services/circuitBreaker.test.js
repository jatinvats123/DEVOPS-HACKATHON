import { describe, it, expect } from '@jest/globals';
import {
  BreakerState,
  cooldownFor,
  evaluateBreaker,
  onCheckSuccess,
  onCheckFailure,
} from '../../src/services/circuitBreaker.js';
import { schedulerConfig } from '../../src/config/scheduler.config.js';

/**
 * Circuit breaker state machine.
 *
 * The breaker is written as pure functions over persisted monitor fields — they
 * take state and a clock reading and return a patch. That is what lets every
 * transition be asserted directly here, with no database and no fake timers.
 */
describe('Circuit breaker', () => {
  const THRESHOLD = schedulerConfig.BREAKER_FAILURE_THRESHOLD;
  const now = Date.now();

  describe('evaluateBreaker', () => {
    it('allows checks while CLOSED', () => {
      const result = evaluateBreaker({ breakerState: 'CLOSED' }, now);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe(BreakerState.CLOSED);
    });

    it('treats a monitor with no breaker state as CLOSED', () => {
      expect(evaluateBreaker({}, now).allowed).toBe(true);
    });

    it('BLOCKS checks while OPEN and inside the cooldown', () => {
      const monitor = {
        breakerState: 'OPEN',
        breakerRetryAt: new Date(now + 60_000),
      };
      const result = evaluateBreaker(monitor, now);

      // The whole point: an open breaker consumes no worker slot and makes no
      // HTTP request at all.
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe(BreakerState.OPEN);
    });

    it('allows a single HALF_OPEN probe once the cooldown expires', () => {
      const monitor = {
        breakerState: 'OPEN',
        breakerRetryAt: new Date(now - 1),
      };
      const result = evaluateBreaker(monitor, now);

      expect(result.allowed).toBe(true);
      expect(result.mode).toBe(BreakerState.HALF_OPEN);
      expect(result.patch).toEqual({ breakerState: 'HALF_OPEN' });
    });

    it('lets an in-progress HALF_OPEN probe through', () => {
      const result = evaluateBreaker({ breakerState: 'HALF_OPEN' }, now);
      expect(result.allowed).toBe(true);
      expect(result.mode).toBe(BreakerState.HALF_OPEN);
    });
  });

  describe('opening', () => {
    it('does NOT open before the failure threshold is reached', () => {
      const patch = onCheckFailure(
        { breakerState: 'CLOSED' },
        THRESHOLD - 1,
        now
      );
      expect(patch.breakerState).toBeUndefined();
    });

    it('opens exactly at the failure threshold', () => {
      const patch = onCheckFailure({ breakerState: 'CLOSED' }, THRESHOLD, now);
      expect(patch.breakerState).toBe('OPEN');
      expect(patch.breakerConsecutiveOpens).toBe(1);
      expect(patch.breakerRetryAt.getTime()).toBeGreaterThan(now);
    });

    it('reopens immediately when a HALF_OPEN probe fails', () => {
      // The probe WAS the test, and it failed — no second chance needed.
      const patch = onCheckFailure(
        { breakerState: 'HALF_OPEN', breakerConsecutiveOpens: 1 },
        1,
        now
      );
      expect(patch.breakerState).toBe('OPEN');
      expect(patch.breakerConsecutiveOpens).toBe(2);
    });
  });

  describe('closing', () => {
    it('closes and clears escalation on a successful probe', () => {
      const patch = onCheckSuccess({
        breakerState: 'HALF_OPEN',
        breakerConsecutiveOpens: 3,
      });

      expect(patch.breakerState).toBe('CLOSED');
      expect(patch.breakerRetryAt).toBeNull();
      // A recovered target returns to normal cadence immediately rather than
      // serving out a long cooldown it no longer deserves.
      expect(patch.breakerConsecutiveOpens).toBe(0);
    });

    it('is a no-op when the breaker is already CLOSED', () => {
      expect(onCheckSuccess({ breakerState: 'CLOSED' })).toEqual({});
    });
  });

  describe('cooldown escalation', () => {
    it('doubles with each consecutive open', () => {
      expect(cooldownFor(1)).toBe(cooldownFor(0) * 2);
      expect(cooldownFor(2)).toBe(cooldownFor(0) * 4);
    });

    it('is capped so a dead endpoint is still probed occasionally', () => {
      expect(cooldownFor(1000)).toBe(schedulerConfig.BREAKER_MAX_COOLDOWN_MS);
    });

    it('starts at the configured base', () => {
      expect(cooldownFor(0)).toBe(schedulerConfig.BREAKER_COOLDOWN_MS);
    });
  });

  it('completes a full open → probe → reopen → probe → close cycle', () => {
    let monitor = { breakerState: 'CLOSED', breakerConsecutiveOpens: 0 };

    monitor = { ...monitor, ...onCheckFailure(monitor, THRESHOLD, now) };
    expect(monitor.breakerState).toBe('OPEN');

    // Still cooling down.
    expect(evaluateBreaker(monitor, now).allowed).toBe(false);

    // Cooldown elapsed → probe.
    const firstProbe = evaluateBreaker(monitor, now + cooldownFor(0) + 1);
    expect(firstProbe.mode).toBe('HALF_OPEN');
    monitor = { ...monitor, ...firstProbe.patch };

    // Probe fails → reopen with a longer cooldown.
    monitor = { ...monitor, ...onCheckFailure(monitor, 1, now) };
    expect(monitor.breakerState).toBe('OPEN');
    expect(monitor.breakerConsecutiveOpens).toBe(2);

    // Later probe succeeds → fully closed.
    monitor = { ...monitor, ...onCheckSuccess(monitor) };
    expect(monitor.breakerState).toBe('CLOSED');
    expect(evaluateBreaker(monitor, now).allowed).toBe(true);
  });
});
