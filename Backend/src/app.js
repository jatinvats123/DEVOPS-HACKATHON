import express from "express";
import HealthRouter from "./routes/health.route.js";
import Middleware from "./app.middleware.js";


const app = express();

Middleware(app)

app.use("/api/health", HealthRouter);

export { app }