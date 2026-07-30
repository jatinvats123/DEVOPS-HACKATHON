import app from './src/app.js';
import { config } from './src/config/config.js';
import ConnectDB from './src/config/database.js';
import logger from './src/config/logger.js';
import MailTranspoter from './src/config/mail.js';
import { scheduler } from './src/jobs/scheduler.js';
import { initSocket } from './src/sockets/server.socket.js';

const PORT = config.PORT || 8080;

// The scheduler must not start before the database is reachable, or its first
// ticks fail and the leader lease cannot be written. The previous version
// called ConnectDB() and startMonitorCron() back to back without awaiting.
await ConnectDB();

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

initSocket(server);
scheduler.start();

/**
 * Graceful shutdown.
 *
 * Ordering matters: stop accepting new HTTP work, let in-flight checks drain,
 * then release the scheduler lease so a standby instance can take over
 * immediately instead of waiting out the full lock TTL. Without this, every
 * deploy leaves monitoring paused for up to one lease period.
 */
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[shutdown] received ${signal}, draining...`);

  // Hard ceiling: if draining stalls, exit anyway rather than let the
  // orchestrator SIGKILL us at an arbitrary point.
  const failsafe = setTimeout(() => {
    logger.error('[shutdown] grace period exceeded, forcing exit');
    process.exit(1);
  }, 30_000);
  failsafe.unref();

  try {
    await new Promise((resolve) => server.close(resolve));
    await scheduler.stop();
    // Close the pooled SMTP connections rather than have process.exit sever
    // them. Not load-bearing — measured, an idle pool does not hold the event
    // loop open, and the exit below would end the process regardless — but it
    // ends the conversations with a QUIT instead of a dropped TCP connection,
    // which is what the provider would otherwise log on every deploy.
    MailTranspoter.close();
    logger.info('[shutdown] clean exit');
    process.exit(0);
  } catch (err) {
    logger.error(`[shutdown] failed: ${err.message}`);
    process.exit(1);
  }
}

// SIGTERM is what Docker/Kubernetes/Render actually send.
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
