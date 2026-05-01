import express from "express";
import HealthRouter from "./routes/health.route.js";
import UserRouter from "./routes/user.routes.js";
import Middleware from "./app.middleware.js";


const app = express();

Middleware(app)

app.use("/api/health", HealthRouter);
app.use("/api/auth", UserRouter);

export default app;