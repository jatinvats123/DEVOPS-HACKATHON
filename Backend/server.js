import app from "./src/app.js";
import { config } from "./src/config/config.js";
import ConnectDB from "./src/config/database.js";
import logger from "./src/config/logger.js";

const PORT = config.PORT;

const PORT = config.PORT || 8080;

// Connect to the database and start the server
ConnectDB();
startMonitorCron(); // Start the cron job to check monitors

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
})
