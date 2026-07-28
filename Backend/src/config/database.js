import { config } from './config.js';
import mongoose from 'mongoose';
import logger from './logger.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500;

/**
 * Connect to MongoDB, with bounded retry.
 *
 * Two fixes over the previous version:
 *  - it now RETURNS the promise, so callers can actually await the connection.
 *    Without this the scheduler started before the database was reachable and
 *    its first ticks failed;
 *  - a transient blip (a container starting a second before Mongo is ready, a
 *    brief Atlas failover) no longer kills the process on the first error.
 *
 * After the retry budget is exhausted we still exit non-zero: a monitoring
 * service that cannot reach its database should fail loudly and let the
 * orchestrator restart it, not sit there silently monitoring nothing.
 */
const ConnectDB = async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(config.MONGO_URL);
      logger.info('MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      const isLast = attempt === MAX_ATTEMPTS;
      logger.error(
        `MongoDB connection failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`
      );
      if (isLast) {
        process.exit(1);
      }
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default ConnectDB;
