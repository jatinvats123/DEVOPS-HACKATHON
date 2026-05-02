import app from './src/app.js';
import { config } from './src/config/config.js';
import ConnectDB from './src/config/database.js';
import { startMonitorCron } from './src/jobs/monitorCron.js';

const PORT = config.PORT || 8080;

// Connect to the database and start the server
ConnectDB();
startMonitorCron(); // Start the cron job to check monitors

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
