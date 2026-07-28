import dotenv from 'dotenv';

dotenv.config();

/**
 * Scheduler tunables. Every value is env-overridable so behaviour can be tuned
 * per environment (and pinned hard in tests) without a code change.
 *
 * Kept separate from `config.js` because that module throws on missing vars at
 * import time — these all have safe defaults and must never block boot.
 *
 * See docs/SCHEDULER.md for what each knob actually does.
 */

const num = (raw, fallback) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const bool = (raw, fallback) => {
  if (raw === undefined || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true' || raw === '1';
};

export const schedulerConfig = {
  // --- loop ---
  ENABLED: bool(process.env.SCHEDULER_ENABLED, true),
  TICK_MS: num(process.env.SCHEDULER_TICK_MS, 5_000),
  CONCURRENCY: Math.max(1, num(process.env.SCHEDULER_CONCURRENCY, 10)),
  SHUTDOWN_GRACE_MS: num(process.env.SCHEDULER_SHUTDOWN_GRACE_MS, 10_000),

  // --- leader election ---
  LOCK_ID: 'monitor-scheduler',
  LOCK_TTL_MS: num(process.env.SCHEDULER_LOCK_TTL_MS, 30_000),

  // --- per-check retry ladder ---
  MAX_RETRIES: num(process.env.CHECK_MAX_RETRIES, 2),
  RETRY_BASE_MS: num(process.env.CHECK_RETRY_BASE_MS, 250),
  RETRY_CAP_MS: num(process.env.CHECK_RETRY_CAP_MS, 4_000),

  // --- circuit breaker ---
  BREAKER_FAILURE_THRESHOLD: Math.max(
    1,
    num(process.env.BREAKER_FAILURE_THRESHOLD, 5)
  ),
  BREAKER_COOLDOWN_MS: num(process.env.BREAKER_COOLDOWN_MS, 60_000),
  BREAKER_MAX_COOLDOWN_MS: num(process.env.BREAKER_MAX_COOLDOWN_MS, 900_000),

  // --- retention ---
  LOG_RETENTION_DAYS: Math.max(1, num(process.env.LOG_RETENTION_DAYS, 30)),
};

export default schedulerConfig;
