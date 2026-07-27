import app from './src/app.js';
import { config } from './src/config/config.js';
import ConnectDB from './src/config/database.js';
import logger from './src/config/logger.js';
import { startMonitorCron } from './src/jobs/monitorCron.js';

import { initSocket } from './src/sockets/server.socket.js';

const PORT = config.PORT || 8080;

ConnectDB(); // Connect to the database and start the server
startMonitorCron(); // Start the cron job to check monitors

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

initSocket(server);
