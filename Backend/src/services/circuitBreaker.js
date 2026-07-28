import { schedulerConfig } from '../config/scheduler.config.js';

/**
 * Per-monitor circuit breaker.
 *
 * Purpose is resource protection, not status reporting: a permanently dead
 * endpoint must not keep consuming worker-pool slots and full retry ladders
 * forever. See docs/SCHEDULER.md §5.
 *
 * Written as pure functions over a monitor's persisted breaker fields. They
 * take state and return a patch; they never touch the database and never read
 * the clock except through the injected `nowMs`. That makes every transition
 * directly unit-testable without a database or fake timers.
 *
 *   CLOSED     → normal: one attempt plus the full retry ladder
 *   OPEN       → skip the check entirely until `breakerRetryAt`
 *   HALF_OPEN  → exactly one attempt, no retries; success closes, failure reopens
 */

export const BreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

/**
 * Cooldown doubles per consecutive open, capped. A target that has been dead
 * for an hour gets probed every 15 minutes rather than every 5 seconds.
 */
export function cooldownFor(consecutiveOpens) {
  const growth = schedulerConfig.BREAKER_COOLDOWN_MS * 2 ** consecutiveOpens;
  return Math.min(growth, schedulerConfig.BREAKER_MAX_COOLDOWN_MS);
}

/**
 * Decide whether a due monitor may actually be checked right now.
 *
 * @returns {{allowed: boolean, mode: string, patch: object|null}}
 *   `mode` is HALF_OPEN when this is a probe (caller must disable retries).
 *   `patch` is a state change to persist alongside the check.
 */
export function evaluateBreaker(monitor, nowMs = Date.now()) {
  const state = monitor.breakerState || BreakerState.CLOSED;

  if (state === BreakerState.CLOSED) {
    return { allowed: true, mode: BreakerState.CLOSED, patch: null };
  }

  if (state === BreakerState.HALF_OPEN) {
    // Already probing — let the single attempt through.
    return { allowed: true, mode: BreakerState.HALF_OPEN, patch: null };
  }

  // OPEN: allowed only once the cooldown has elapsed, and then only as a probe.
  const retryAt = monitor.breakerRetryAt
    ? new Date(monitor.breakerRetryAt).getTime()
    : 0;

  if (nowMs >= retryAt) {
    return {
      allowed: true,
      mode: BreakerState.HALF_OPEN,
      patch: { breakerState: BreakerState.HALF_OPEN },
    };
  }

  return { allowed: false, mode: BreakerState.OPEN, patch: null };
}

/**
 * Successful check. Closes the breaker and clears the escalation counter, so a
 * target that recovers returns to normal cadence immediately rather than
 * serving out a long cooldown it no longer deserves.
 */
export function onCheckSuccess(monitor) {
  if ((monitor.breakerState || BreakerState.CLOSED) === BreakerState.CLOSED) {
    return {};
  }
  return {
    breakerState: BreakerState.CLOSED,
    breakerOpenedAt: null,
    breakerRetryAt: null,
    breakerConsecutiveOpens: 0,
  };
}

/**
 * Failed check.
 *
 * From HALF_OPEN a single failure reopens immediately with a longer cooldown —
 * the probe was the test, and it failed.
 *
 * From CLOSED the breaker opens only once `consecutiveFailures` has reached the
 * threshold. `consecutiveFailures` is the caller's already-incremented value, so
 * breaker escalation and incident flap detection stay driven by the same
 * counter rather than two competing ones.
 */
export function onCheckFailure(
  monitor,
  consecutiveFailures,
  nowMs = Date.now()
) {
  const state = monitor.breakerState || BreakerState.CLOSED;

  if (state === BreakerState.HALF_OPEN) {
    const opens = (monitor.breakerConsecutiveOpens || 0) + 1;
    return {
      breakerState: BreakerState.OPEN,
      breakerOpenedAt: new Date(nowMs),
      breakerRetryAt: new Date(nowMs + cooldownFor(opens)),
      breakerConsecutiveOpens: opens,
    };
  }

  if (
    state === BreakerState.CLOSED &&
    consecutiveFailures >= schedulerConfig.BREAKER_FAILURE_THRESHOLD
  ) {
    return {
      breakerState: BreakerState.OPEN,
      breakerOpenedAt: new Date(nowMs),
      breakerRetryAt: new Date(nowMs + cooldownFor(0)),
      breakerConsecutiveOpens: 1,
    };
  }

  return {};
}

export default {
  BreakerState,
  cooldownFor,
  evaluateBreaker,
  onCheckSuccess,
  onCheckFailure,
};
