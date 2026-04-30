import { config } from "./config.js";
import mongoose from "mongoose";

const ConnectDB = () => {
    mongoose.connect(config.MONGO_URL).then(() => {
        console.log("MongoDB connected");
    }).catch((err) => {
        console.log(err);
    });
};

export default ConnectDB;