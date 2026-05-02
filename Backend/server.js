import app from "./src/app.js";
import { config } from "./src/config/config.js";
import ConnectDB from "./src/config/database.js";
import logger from "./src/config/logger.js";

const PORT = config.PORT;


// Connect to the database and start the server
ConnectDB()


app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
})