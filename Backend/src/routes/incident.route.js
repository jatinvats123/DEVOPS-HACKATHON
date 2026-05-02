import express from 'express';
import { getIncidentsByMonitorIdController } from '../controllers/incident.controller';
const IncidentRouter = express.Router();

/*
@route GET /api/incidents/:monitorId
@desc Get incidents for a specific monitor
@access Private
*/
IncidentRouter.get('/:monitorId', getIncidentsByMonitorIdController);

export default IncidentRouter;
