import { config } from "./config.js";
import mongoose from "mongoose";
import logger from "./logger.js";

const ConnectDB = () => {
    mongoose.connect(config.MONGO_URL).then(() => {
        logger.info("MongoDB connected");
    }).catch((err) => {
        logger.error("MongoDB connection failed", err);
        process.exit(1);
    });
};

export default ConnectDB;