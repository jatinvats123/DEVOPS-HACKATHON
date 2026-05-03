import express from 'express';
import { getIncidentsByMonitorIdController } from '../controllers/incident.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
const IncidentRouter = express.Router();

/*
@route GET /api/incidents/:monitorId
@desc Get incidents for a specific monitor
@access Private
*/
IncidentRouter.get('/:monitorId', verifyJWT, getIncidentsByMonitorIdController);

export default IncidentRouter;
