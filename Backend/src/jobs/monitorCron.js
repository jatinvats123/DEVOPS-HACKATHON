import cron from 'node-cron';
import monitorModel from '../models/monitor.model.js';
import logModel from '../models/logs.model.js';
import { checkMonitor } from '../services/monitor.service.js';

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

    for (const monitor of monitors) {
      const result = await checkMonitor(monitor.url, monitor.timeout);

      if (result.status === 'DOWN') {
        const isReallyDownResult = await isReallyDown(
          monitor.url,
          monitor.timeout
        );
        if (isReallyDownResult) {
          console.error(
            `Monitor ${monitor.url} is DOWN (Response Time: ${result.responseTime}ms)`
          );
        }
      } else {
        console.log(
          `Monitor ${monitor.url} is ${result.status} (Response Time: ${result.responseTime}ms)`
        );
      }
      // Save the result to the logs collection
      const logEntry = new logModel({
        monitorId: monitor._id,
        status: result.status,
        latency: result.responseTime || null,
        statusCode: result.statusCode || null,
        error: result.error || null,
        timestamp: new Date(),
      });
      await logEntry.save();
    }
  });
}
