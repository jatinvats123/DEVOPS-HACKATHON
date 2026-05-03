import express from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  getLatencyMetrics,
  getStatusTimeline,
  getUptimeMetrics,
} from '../controllers/metrics.controller.js';

const metricsRouter = express.Router();

/*
@route   GET /api/metrics/latency/:monitorId
@desc    Get latency metrics for a specific monitor
@access  Private (requires authentication)
*/
metricsRouter.get('/latency/:monitorId', verifyJWT, getLatencyMetrics);

/*
@route   GET /api/metrics/uptime/:monitorId
@desc    Get uptime metrics for a specific monitor
@access  Private (requires authentication)
*/
metricsRouter.get('/uptime/:monitorId', verifyJWT, getUptimeMetrics);

/*
@route   GET /api/metrics/status-timeline/:monitorId
@desc    Get status timeline for a specific monitor
@access  Private (requires authentication)
*/
metricsRouter.get('/status-timeline/:monitorId', verifyJWT, getStatusTimeline);

export default metricsRouter;
