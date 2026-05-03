import express from "express";
import { HealthController } from "../controllers/health.controller.js";

const HealthRouter = express.Router();

/*
@route GET /api/health
@desc Check the health of the application
@access Public
*/
HealthRouter.get("/", HealthController);

export default HealthRouter;