import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getSchedulerStats } from '../jobs/scheduler.js';
import { schedulerConfig } from '../config/scheduler.config.js';
import { mongoUp } from '../observability/metrics.js';
// Deliberately NOT from services/sendEmail.js: three suites replace that module
// wholesale, and a health check should not break because an unrelated test
// stubbed the mailer. This asks the configuration directly.
import { isBrevoConfigured } from '../services/brevo.provider.js';
import { config } from '../config/config.js';

/**
 * Liveness vs readiness — two different questions, deliberately separate.
 *
 * LIVENESS ("/api/health") asks: is this process alive? It must not touch the
 * database. A liveness probe that fails during a database outage causes the
 * orchestrator to kill and restart every replica — turning a recoverable
 * dependency failure into a crash loop that guarantees downtime.
 *
 * READINESS ("/api/health/ready") asks: can this instance do useful work? It
 * does check dependencies, so a replica that cannot reach MongoDB is pulled out
 * of the load balancer while staying alive to recover.
 *
 * Conflating them is one of the most common production mistakes in this shape
 * of service.
 */

/** Liveness. Static by design — no I/O, no dependencies, always cheap. */
export const HealthController = asyncHandler((req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      'All Good!'
    )
  );
});

/**
 * Is MongoDB actually usable?
 *
 * `readyState === 1` only says the driver believes it is connected. An admin
 * `ping` is what proves a query can complete — the two diverge exactly when it
 * matters, during a network partition the driver has not noticed yet.
 */
async function checkMongo() {
  const startedAt = Date.now();
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;

  if (readyState !== 1) {
    return {
      status: 'down',
      detail: `connection is ${states[readyState] ?? 'unknown'}`,
    };
  }

  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch (err) {
    return {
      status: 'down',
      detail: err.message,
      latencyMs: Date.now() - startedAt,
    };
  }
}

/**
 * Has the scheduler ticked recently?
 *
 * A stopped scheduler is this product's defining silent failure: the API keeps
 * answering, dashboards keep rendering the last known state, and nobody is told
 * their service went down. Nothing external can detect it — which is precisely
 * why it has to be surfaced here.
 *
 * Every instance ticks (leadership only gates the *work*), so this is a valid
 * signal on followers too.
 */
function checkScheduler() {
  if (!schedulerConfig.ENABLED) {
    // A deliberately API-only instance is not unhealthy for having no ticks.
    return { status: 'disabled', detail: 'SCHEDULER_ENABLED=false' };
  }

  const stats = getSchedulerStats();

  if (!stats.lastTickAt) {
    return { status: 'starting', detail: 'no tick completed yet' };
  }

  const ageMs = Date.now() - new Date(stats.lastTickAt).getTime();
  // Five missed ticks, floored at 60s so a fast tick interval does not make
  // readiness flap on a single slow scrape.
  const staleAfterMs = Math.max(schedulerConfig.TICK_MS * 5, 60_000);

  return {
    status: ageMs > staleAfterMs ? 'stale' : 'up',
    lastTickAgeSeconds: Math.round(ageMs / 1000),
    staleAfterSeconds: Math.round(staleAfterMs / 1000),
    isLeader: stats.isLeader,
    inFlight: stats.inFlight,
  };
}

/**
 * Which transport outbound mail would use, and whether it is usable at all.
 *
 * Reported but NOT part of the ready/not-ready decision: an instance that
 * cannot send email can still serve every read and write in the product, and
 * failing readiness would take it out of rotation over a degraded side channel.
 *
 * It is reported because the alternative is what already happened — production
 * sent nothing for days while every endpoint returned 200. The password-reset
 * endpoint answers 200 by design so it cannot be used to enumerate accounts,
 * which means a broken mail path has no user-visible symptom whatsoever. This
 * is the one place an operator can see it.
 */
function checkMail() {
  const provider = isBrevoConfigured() ? 'brevo' : 'smtp';

  if (provider === 'brevo') {
    return { status: 'configured', provider, transport: 'https' };
  }
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    return { status: 'unconfigured', provider, transport: 'smtp' };
  }
  return {
    status: 'configured',
    provider,
    transport: 'smtp',
    // Worth stating plainly: SMTP is blocked outbound on some hosts (Render's
    // free tier blocks 25/465/587), and this check cannot detect that without
    // opening a connection on every scrape.
    note: 'SMTP requires outbound 587; set BREVO_API_KEY where that is blocked',
  };
}

/**
 * Readiness. 200 when this instance can serve traffic, 503 when it cannot.
 *
 * The status code is what an orchestrator acts on, so it is derived only from
 * conditions that genuinely make the instance unable to work:
 *  - MongoDB unreachable  -> not ready
 *  - scheduler stale      -> not ready
 *  - scheduler starting   -> ready (a cold instance should still take traffic;
 *                            the API works before the first tick completes)
 */
export const ReadinessController = asyncHandler(async (req, res) => {
  const [mongo, scheduler] = [await checkMongo(), checkScheduler()];

  mongoUp.set(mongo.status === 'up' ? 1 : 0);

  const ready = mongo.status === 'up' && scheduler.status !== 'stale';
  const statusCode = ready ? 200 : 503;

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        status: ready ? 'ready' : 'not_ready',
        checks: { mongodb: mongo, scheduler, mail: checkMail() },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      ready ? 'Ready to serve traffic' : 'Not ready'
    )
  );
});
