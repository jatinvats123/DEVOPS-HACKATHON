import {
  createMonitorController,
  deleteMonitorController,
  getAllMonitorsController,
} from '../controllers/monitor.controller.js';
import {
  createMonitorValidator,
  deleteMonitorValidator,
} from '../validators/monitor.validator.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/monitor.middleware.js';

import express from 'express';
const MonitorRouter = express.Router();

/*
@route POST /api/monitor
@desc Create a new monitor
@access Private
*/
MonitorRouter.post(
  '/',
  verifyJWT,
  // validate(createMonitorValidator),
  createMonitorController
);

/*
@route GET /api/monitor
@desc Get all monitors for the authenticated user
@access Private
*/
MonitorRouter.get('/', verifyJWT, getAllMonitorsController);

/*
@route DELETE /api/monitor/:monitorId
@desc Delete a monitor 
@access Private
*/
MonitorRouter.delete(
  '/:monitorId',
  verifyJWT,
  validate(deleteMonitorValidator),
  deleteMonitorController
);

export default MonitorRouter;
