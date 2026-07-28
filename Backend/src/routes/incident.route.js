import express from 'express';
import {
  getIncidentsByMonitorIdController,
  getIncidentByIdController,
  getAllIncidentsController,
} from '../controllers/incident.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const IncidentRouter = express.Router();

/*
@route GET /api/incidents
@desc Get all incidents
@access Private
*/
IncidentRouter.get('/', verifyJWT, getAllIncidentsController);

/*
@route GET /api/incidents/:monitorId
@desc Get incidents for a specific monitor
@access Private
*/
IncidentRouter.get('/detail/:incidentId', verifyJWT, getIncidentByIdController);
IncidentRouter.get('/:monitorId', verifyJWT, getIncidentsByMonitorIdController);

export default IncidentRouter;
