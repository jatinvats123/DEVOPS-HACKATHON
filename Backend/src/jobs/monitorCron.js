import cron from 'node-cron';
import monitorModel from '../models/monitor.model.js';
import logModel from '../models/logs.model.js';
import { checkMonitor } from '../services/monitor.service.js';
import {
  createIncident,
  resolveIncident,
} from '../services/incident.service.js';

async function isReallyDown(url, timeout) {
  // Perform multiple checks to confirm the monitor is really down
  for (let i = 0; i < 3; i++) {
    const result = await checkMonitor(url, timeout);
    if (result.status !== 'DOWN') {
      return false;
    }
  }
  return true;
}

export async function startMonitorCron() {
  console.log('Starting monitor cron job...');

  // Schedule the cron job to run every minute
  cron.schedule('* * * * *', async () => {
    console.log('Running monitor checks at', new Date().toISOString());

    const monitors = await monitorModel.find();

    if (monitors.length === 0) {
      console.log('No monitors found to check.');
      return;
    }
    await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const now = new Date();
          const lastChecked = new Date(monitor.lastChecked || 0).getTime();

          const differenceInSeconds = (now - lastChecked) / 1000;
          if (differenceInSeconds < monitor.interval) {
            return; // Skip this monitor if it's not time to check yet
          }

          const prevStatus = monitor.status; // Assuming you have a status field in your monitor model
          const result = await checkMonitor(monitor.url, monitor.timeout);
          let currentStatus = result.status;

          //Retry Logic
          if (result.status === 'DOWN') {
            const isReallyDownResult = await isReallyDown(
              monitor.url,
              monitor.timeout
            );
            if (!isReallyDownResult) currentStatus = 'UP'; // If it's not really down, set status to UP

            if (isReallyDownResult) {
              console.error(
                `Monitor ${monitor.url} is DOWN (Response Time: ${result.responseTime}ms)`
              );
            }
          }

          // Incident management logic
          if (prevStatus === 'UP' && currentStatus === 'DOWN') {
            await createIncident(
              monitor._id,
              result.error || `Monitor ${monitor.url} is down`
            );
          }

          if (prevStatus === 'DOWN' && currentStatus === 'UP') {
            await resolveIncident(monitor._id);
          }

          // Update the monitor status in the database
          monitor.status = currentStatus;
          monitor.lastChecked = new Date();
          await monitor.save();

          // Save the result to the logs collection
          const logEntry = new logModel({
            monitorId: monitor._id,
            status: currentStatus,
            latency: result.responseTime || null,
            statusCode: result.statusCode || null,
            error: result.error || null,
            timestamp: new Date(),
          });
          await logEntry.save();
        } catch (error) {
          console.error(`Error checking monitor ${monitor.url}:`, error);
        }
      })
    );
  });
}
