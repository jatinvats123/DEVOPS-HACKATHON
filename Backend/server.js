import http from 'http';
import app from './src/app.js';
import { config } from './src/config/config.js';
import ConnectDB from './src/config/database.js';
import logger from './src/config/logger.js';
import { startMonitorCron } from './src/jobs/monitorCron.js';
import { initSocket } from './src/sockets/index.js';
import './dns.js';

const PORT = config.PORT || 8080;

const server = http.createServer(app);

ConnectDB(); // Connect to the database
startMonitorCron(); // Start the cron job to check monitors
initSocket(server); // Attach the real-time Socket.IO layer

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
