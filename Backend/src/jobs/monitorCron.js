import cron from 'node-cron';
import monitorModel from '../models/monitor.model.js';
import logModel from '../models/logs.model.js';
import { checkMonitor } from '../services/monitor.service.js';
import {
  createIncident,
  resolveIncident,
} from '../services/incident.service.js';
import logger from '../config/logger.js';

async function isReallyDown(url, timeout) {
  // Perform multiple checks to confirm the monitor is really down
  for (let i = 0; i < 3; i++) {
    // Wait 2 seconds between retries to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = await checkMonitor(url, timeout);
    if (result.status !== 'DOWN') {
      return false;
    }
  }
  return true;
}

export async function startMonitorCron() {
  logger.info('Starting monitor cron job...');

  let isRunning = false;

  // Schedule the cron job to run every second (for testing purposes, you can change this to every minute in production)
  cron.schedule('*/10 * * * * *', async () => {
    if (isRunning) return;
    isRunning = true;

    // Wrapped in try/finally: if anything throws (e.g. a DB blip), isRunning
    // must still reset or the cron would stay "locked" and monitoring would
    // silently stop forever.
    try {
    logger.info(
      `Running monitor checks at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    );

    const monitors = await monitorModel.find();

    if (monitors.length === 0) {
      logger.info(
        'No monitors found to check. please add some monitors to start monitoring.'
      );
      return;
    }
    await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const now = Date.now();
          const lastChecked = new Date(monitor.lastChecked || 0).getTime();

          const differenceInSeconds = (now - lastChecked) / 1000;
          if (differenceInSeconds < monitor.interval - 2) {
            // Adding a small buffer of 2 seconds to account for any delays in cron execution
            return; // Skip this monitor if it's not time to check yet
          }

          const prevStatus = monitor.status; // Assuming you have a status field in your monitor model

          logger.info(`previous status: ${monitor.status}`);

          const result = await checkMonitor(monitor.url, monitor.timeout * 1000);

          let currentStatus = result.status;

          logger.info(`current status: ${currentStatus}`);

          //Retry Logic
          if (result.status === 'DOWN') {
            const isReallyDownResult = await isReallyDown(
              monitor.url,
              monitor.timeout * 1000
            );
            if (!isReallyDownResult) currentStatus = 'UP'; // If it's not really down, it's UP

            if (isReallyDownResult) {
              logger.error(
                `Monitor ${monitor.url} is REALLY DOWN (Response Time: ${result.responseTime}ms)`
              );
            }
          }

          // Update the monitor status in the database (Do this first to ensure UI is accurate)
          monitor.status = currentStatus;
          monitor.lastChecked = new Date();
          monitor.lastStatusCode = result.statusCode;
          await monitor.save();

          // Save the result to the logs collection
          await logModel.create({
            monitorId: monitor._id,
            status: currentStatus,
            latency: result.responseTime || null,
            statusCode: result.statusCode || null,
            error: result.error || null,
            timestamp: new Date(),
          });

          // Incident management logic (In separate try/catch so status update isn't blocked)
          try {
            if (
              (prevStatus === 'UP' && currentStatus === 'DOWN') ||
              (prevStatus === 'DOWN' && currentStatus === 'DOWN')
            ) {
              await createIncident(
                monitor._id,
                result.error || `Monitor ${monitor.url} is down`
              );
            }

            if (prevStatus === 'DOWN' && currentStatus === 'UP') {
              await resolveIncident(monitor._id);
            }
          } catch (incidentError) {
            logger.error(`Incident management failed for ${monitor.url}:`, incidentError);
          }
        } catch (error) {
          logger.error(`Error checking monitor ${monitor.url}:`, error);
        }
      })
    );
    } catch (error) {
      logger.error('Monitor cron run failed:', error);
    } finally {
      isRunning = false;
    }
  });
}
