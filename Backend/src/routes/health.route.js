import express from 'express';
import {
  HealthController,
  ReadinessController,
} from '../controllers/health.controller.js';

const HealthRouter = express.Router();

/*
@route GET /api/health
@desc Liveness — is the process alive? Touches nothing. A liveness probe that
      fails during a database outage would make the orchestrator restart every
      replica, converting a recoverable dependency failure into a crash loop.
@access Public
*/
HealthRouter.get('/', HealthController);

/*
@route GET /api/health/ready
@desc Readiness — can this instance do useful work? Checks MongoDB and the
      scheduler heartbeat. Returns 503 when it cannot, so a broken replica is
      removed from the load balancer while staying alive to recover.
@access Public
*/
HealthRouter.get('/ready', ReadinessController);

export default HealthRouter;
