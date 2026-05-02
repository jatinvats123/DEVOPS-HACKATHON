import cron from 'node-cron';
import Monitor from '../models/monitor.model.js';
import { checkMonitor } from '../services/monitor.service.js';

cron.schedule('* * * * *', async () => {
  console.log('Running monitor checks at', new Date().toISOString());
  const monitors = await Monitor.find();
  for (const monitor of monitors) {
    const result = await checkMonitor(monitor.url, monitor.timeout);

    if (result.status === 'DOWN') {
      // Here you can implement alerting logic, e.g., send an email or push notification
      console.error(`ALERT: Monitor ${monitor.url} is DOWN!`);
    } else {
      console.log(
        `Monitor ${monitor.url} is ${result.status} (Response Time: ${result.responseTime}ms)`
      );
    }

    // Here you can also save the result to a database or trigger alerts if the monitor is down
  }
});
