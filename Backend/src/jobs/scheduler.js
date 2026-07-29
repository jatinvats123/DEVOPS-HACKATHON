import monitorModel from '../models/monitor.model.js';
import logModel from '../models/logs.model.js';
import { checkMonitor } from '../services/monitor.service.js';
import { openIncident, closeIncident } from '../services/incident.service.js';
import { SchedulerLock, INSTANCE_ID } from '../services/lock.service.js';
import {
  evaluateBreaker,
  onCheckSuccess,
  onCheckFailure,
  BreakerState,
} from '../services/circuitBreaker.js';
import { runPool } from '../utils/pool.js';
import { schedulerConfig } from '../config/scheduler.config.js';
import { decryptAuthHeaders } from '../utils/crypto.js';
import { emitToUser, SocketEvent } from '../sockets/server.socket.js';
import {
  checksExecutedTotal,
  checkDurationSeconds,
  checksSkippedTotal,
  incidentsOpenedTotal,
  incidentsClosedTotal,
  schedulerTickDurationSeconds,
} from '../observability/metrics.js';
import logger from '../config/logger.js';

/**
 * Monitor scheduler.
 *
 * Full behavioural contract — including the reasoning behind each choice — is
 * in docs/SCHEDULER.md. Summary:
 *
 *  - exactly one leader executes checks (MongoDB lease lock);
 *  - overlapping checks for one monitor are SKIPPED, never queued or cancelled;
 *  - durations use the monotonic clock; scheduling state is durable;
 *  - overdue monitors are checked once and rescheduled from now (no catch-up
 *    stampede after a restart or a forward clock jump);
 *  - concurrency is bounded and a dead endpoint trips a per-monitor breaker;
 *  - incidents are edge-triggered on configurable N/M consecutive results.
 */

/** Never load the whole collection into memory in one tick. */
const MAX_BATCH = 500;

/**
 * Floor on how often any target may be probed, regardless of what the monitor
 * document says. Without it a user could set `interval: 0` and have us hammer
 * a third-party endpoint as fast as the event loop allows — which is both a
 * self-inflicted denial of service and something the owner of that endpoint
 * would reasonably call abuse.
 */
const MIN_INTERVAL_SECONDS = 5;

export class MonitorScheduler {
  constructor(options = {}) {
    this.tickMs = options.tickMs ?? schedulerConfig.TICK_MS;
    this.concurrency = options.concurrency ?? schedulerConfig.CONCURRENCY;
    this.shutdownGraceMs =
      options.shutdownGraceMs ?? schedulerConfig.SHUTDOWN_GRACE_MS;
    this.lock = options.lock ?? new SchedulerLock();
    // Injectable like every other option, so a test can drive the loop while
    // the process-wide instance stays disabled. Defaults to the env setting, so
    // production behaviour is unchanged.
    this.enabled = options.enabled ?? schedulerConfig.ENABLED;

    /** Monitor ids with a check currently in flight — the overlap guard. */
    this.inFlight = new Set();

    this.timer = null;
    this.running = false;
    this.ticking = false;

    this.stats = {
      instanceId: INSTANCE_ID,
      isLeader: false,
      ticks: 0,
      checksExecuted: 0,
      checksSucceeded: 0,
      checksFailed: 0,
      skippedOverlap: 0,
      skippedBreaker: 0,
      incidentsOpened: 0,
      incidentsClosed: 0,
      errors: 0,
      lastTickAt: null,
      lastTickDurationMs: null,
      /** How late the most overdue monitor was, in ms — the real lag signal. */
      maxLagMs: 0,
    };
  }

  start() {
    if (!this.enabled) {
      logger.warn('[scheduler] disabled via SCHEDULER_ENABLED=false');
      return this;
    }
    if (this.running) return this;

    this.running = true;
    logger.info(
      `[scheduler] starting (instance=${INSTANCE_ID}, tick=${this.tickMs}ms, concurrency=${this.concurrency})`
    );

    // setInterval would stack ticks if one ever ran long. A self-rescheduling
    // timeout guarantees the gap is *between* ticks.
    const loop = async () => {
      if (!this.running) return;
      try {
        await this.tick();
      } catch (err) {
        this.stats.errors += 1;
        logger.error(`[scheduler] tick failed: ${err.message}`);
      }
      if (this.running) {
        this.timer = setTimeout(loop, this.tickMs);
        this.timer.unref?.(); // a pending tick must not hold the process open
      }
    };

    this.timer = setTimeout(loop, 0);
    this.timer.unref?.();
    return this;
  }

  /**
   * Graceful shutdown: stop taking new work, let in-flight checks finish (up to
   * the grace period), then release leadership so a standby takes over
   * immediately rather than waiting out the lease TTL.
   */
  async stop() {
    if (!this.running) return;
    this.running = false;
    clearTimeout(this.timer);
    this.timer = null;

    const deadline = Date.now() + this.shutdownGraceMs;
    while (this.inFlight.size > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (this.inFlight.size > 0) {
      logger.warn(
        `[scheduler] shutting down with ${this.inFlight.size} check(s) still in flight`
      );
    }

    await this.lock.release();
    this.stats.isLeader = false;
    logger.info('[scheduler] stopped');
  }

  /** One scheduler iteration. Public so tests can drive it deterministically. */
  async tick() {
    if (this.ticking) return; // belt-and-braces against re-entrancy
    this.ticking = true;
    const startedAt = process.hrtime.bigint();

    try {
      // Followers keep ticking and keep trying, so failover needs no external
      // coordination — it happens within one lease TTL.
      const isLeader = await this.lock.acquire();
      this.stats.isLeader = isLeader;
      if (!isLeader) return;

      this.stats.ticks += 1;
      const now = new Date();

      const due = await this.findDueMonitors(now);
      if (due.length === 0) return;

      this.stats.maxLagMs = due.reduce((max, m) => {
        const lag = now.getTime() - new Date(m.nextCheckAt ?? now).getTime();
        return lag > max ? lag : max;
      }, 0);

      const tasks = [];
      for (const monitor of due) {
        const id = String(monitor._id);

        // OVERLAP POLICY: skip. A monitor slower than its interval is never
        // started twice — we do not queue (backlog against a struggling target)
        // and do not cancel (throws away the measurement in progress).
        if (this.inFlight.has(id)) {
          this.stats.skippedOverlap += 1;
          checksSkippedTotal.inc({ reason: 'overlap' });
          continue;
        }

        // CIRCUIT BREAKER: an open breaker consumes no worker slot at all.
        const breaker = evaluateBreaker(monitor, now.getTime());
        if (!breaker.allowed) {
          this.stats.skippedBreaker += 1;
          checksSkippedTotal.inc({ reason: 'breaker_open' });
          continue;
        }

        this.inFlight.add(id);
        tasks.push(async () => {
          try {
            await this.runCheck(monitor, breaker);
          } finally {
            this.inFlight.delete(id);
          }
        });
      }

      const results = await runPool(tasks, this.concurrency);
      results.forEach((r) => {
        if (!r?.ok) {
          this.stats.errors += 1;
          logger.error(`[scheduler] check crashed: ${r?.error?.message}`);
        }
      });
    } finally {
      this.stats.lastTickAt = new Date();
      this.stats.lastTickDurationMs = Number(
        (process.hrtime.bigint() - startedAt) / 1_000_000n
      );
      schedulerTickDurationSeconds.observe(
        this.stats.lastTickDurationMs / 1000
      );
      this.ticking = false;
    }
  }

  /**
   * Monitors eligible for a check right now.
   *
   * The second `$or` arm is the backward-clock-jump guard: if the wall clock
   * steps backwards, `nextCheckAt` can sit far in the future and a monitor
   * would silently stop being checked forever. A `lastChecked` in the future is
   * impossible under a sane clock, so it is a reliable tell.
   */
  async findDueMonitors(now) {
    return (
      monitorModel
        .find({
          active: { $ne: false },
          $or: [{ nextCheckAt: { $lte: now } }, { lastChecked: { $gt: now } }],
        })
        .sort({ nextCheckAt: 1 }) // most overdue first
        .limit(MAX_BATCH)
        // authHeaders is `select: false` so it can never be returned by accident.
        // The scheduler is the one component that legitimately needs it, so it
        // opts in explicitly.
        .select('+authHeaders')
    );
  }

  /**
   * Execute one monitor's check and apply every consequence: log row, flap
   * counters, breaker state, incident transition, next schedule.
   */
  async runCheck(
    monitor,
    breaker = { mode: BreakerState.CLOSED, patch: null }
  ) {
    const isProbe = breaker.mode === BreakerState.HALF_OPEN;
    const checkStartedAt = process.hrtime.bigint();

    const result = await checkMonitor(monitor.url, {
      timeoutMs: (monitor.timeout || 10) * 1000,
      // A half-open probe gets exactly one attempt: the breaker is open
      // precisely because this endpoint does not deserve a retry ladder.
      maxRetries: isProbe ? 0 : schedulerConfig.MAX_RETRIES,
      ignoreTlsErrors: monitor.ignoreTlsErrors === true,
      // Decrypted only here, in memory, at the moment of use — never persisted
      // in the clear and never returned by the API.
      headers: decryptAuthHeaders(monitor.authHeaders),
    });

    this.stats.checksExecuted += 1;
    const up = result.status === 'UP';
    if (up) this.stats.checksSucceeded += 1;
    else this.stats.checksFailed += 1;

    // Labelled by outcome only — never by monitor id, which would create one
    // time series per monitor and grow without bound as customers are added.
    checksExecutedTotal.inc({ status: result.status });
    checkDurationSeconds.observe(
      { status: result.status },
      Number(process.hrtime.bigint() - checkStartedAt) / 1e9
    );

    const now = new Date();

    // --- flap detection -----------------------------------------------------
    // Counters are persisted on the monitor, so a restart mid-streak resumes
    // rather than starting the threshold over.
    const failureThreshold = Math.max(1, monitor.failureThreshold ?? 3);
    const successThreshold = Math.max(1, monitor.successThreshold ?? 2);

    const consecutiveFailures = up ? 0 : (monitor.consecutiveFailures || 0) + 1;
    const consecutiveSuccesses = up
      ? (monitor.consecutiveSuccesses || 0) + 1
      : 0;

    const intervalSeconds = Math.max(
      MIN_INTERVAL_SECONDS,
      monitor.interval || 60
    );

    const confirmed = monitor.status || 'UP';
    const shouldOpen =
      !up && confirmed === 'UP' && consecutiveFailures >= failureThreshold;
    const shouldClose =
      up && confirmed === 'DOWN' && consecutiveSuccesses >= successThreshold;

    // --- persist the check --------------------------------------------------
    const update = {
      lastChecked: now,
      lastCheckStatus: result.status,
      lastStatusCode: result.statusCode ?? null,
      consecutiveFailures,
      consecutiveSuccesses,
      // Anchored to NOW, not to the previous nextCheckAt. Incrementing the old
      // value accumulates drift as checks take real time, and after downtime it
      // would fire one catch-up check per missed interval.
      nextCheckAt: new Date(now.getTime() + intervalSeconds * 1000),
      ...(breaker.patch || {}),
      ...(up
        ? onCheckSuccess(monitor)
        : onCheckFailure(monitor, consecutiveFailures, now.getTime())),
    };

    if (shouldOpen) update.status = 'DOWN';
    if (shouldClose) update.status = 'UP';

    // Targeted $set rather than doc.save(): the in-memory monitor may be stale
    // by now (the owner could have edited the interval mid-check) and a full
    // document write would clobber their edit.
    await monitorModel.updateOne({ _id: monitor._id }, { $set: update });

    await logModel.create({
      monitorId: monitor._id,
      status: result.status,
      latency: result.responseTime ?? null,
      timings: result.timings ?? {},
      statusCode: result.statusCode ?? null,
      error: result.error ?? null,
      attempts: result.attempts ?? 1,
      timestamp: now,
    });

    // --- realtime push (tenant-scoped) --------------------------------------
    // Emitted into the owner's room only. This is what makes the product's
    // "live status over Socket.IO" claim true — previously the scheduler
    // emitted nothing at all and the UI fell back to HTTP polling.
    emitToUser(monitor.userId, SocketEvent.MONITOR_STATUS, {
      monitorId: String(monitor._id),
      status: update.status ?? confirmed,
      lastCheckStatus: result.status,
      statusCode: result.statusCode ?? null,
      latency: result.responseTime ?? null,
      checkedAt: now,
    });

    // --- incident transitions (edge-triggered, exactly once) ----------------
    try {
      if (shouldOpen) {
        const { incident, opened } = await openIncident(
          { ...monitor.toObject?.(), ...update, _id: monitor._id },
          result.error || `Monitor ${monitor.url} is down`
        );
        if (opened) {
          this.stats.incidentsOpened += 1;
          incidentsOpenedTotal.inc();
          emitToUser(monitor.userId, SocketEvent.INCIDENT_OPENED, {
            monitorId: String(monitor._id),
            incidentId: String(incident?._id ?? ''),
            reason: incident?.reason ?? null,
            startedAt: incident?.startTime ?? now,
          });
        }
      } else if (shouldClose) {
        const { incident, closed } = await closeIncident({
          ...monitor.toObject?.(),
          ...update,
          _id: monitor._id,
        });
        if (closed) {
          this.stats.incidentsClosed += 1;
          incidentsClosedTotal.inc();
          emitToUser(monitor.userId, SocketEvent.INCIDENT_CLOSED, {
            monitorId: String(monitor._id),
            incidentId: String(incident?._id ?? ''),
            durationSeconds: incident?.duration ?? 0,
            resolvedAt: incident?.endTime ?? now,
          });
        }
      }
    } catch (err) {
      // The check result is already durable; a failed incident transition must
      // not lose it. The next check re-evaluates the same threshold.
      this.stats.errors += 1;
      logger.error(
        `[scheduler] incident transition failed for ${monitor.url}: ${err.message}`
      );
    }

    return result;
  }

  getStats() {
    return { ...this.stats, inFlight: this.inFlight.size };
  }
}

/** Process-wide instance, so /health/ready and /metrics can read its heartbeat. */
export const scheduler = new MonitorScheduler();

export function startMonitorScheduler() {
  return scheduler.start();
}

export function stopMonitorScheduler() {
  return scheduler.stop();
}

export function getSchedulerStats() {
  return scheduler.getStats();
}

export default scheduler;
