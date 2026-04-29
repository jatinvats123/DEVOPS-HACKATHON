import express from "express";
import { HealthController } from "../controllers/health.controller.js";

const HealthRouter = express.Router();


HealthRouter.get("/", HealthController);

export default HealthRouter;