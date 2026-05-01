import {
  createMonitorController,
  deleteMonitorController,
  getAllMonitorsController,
} from '../controllers/monitor.controller';
import { verifyJWT } from '../middlewares/auth.middleware.js';

import express from 'express';
const monitorRouter = express.Router();

/*
@route POST /api/monitor
@desc Create a new monitor
@access Private
*/
monitorRouter.post('/', verifyJWT, createMonitorController);

/*
@route GET /api/monitor
@desc Get all monitors for the authenticated user
@access Private
*/
monitorRouter.get('/', verifyJWT, getAllMonitorsController);

/*
@route DELETE /api/monitor/:monitorId
@desc Delete a monitor
@access Private
*/
monitorRouter.delete('/:monitorId', verifyJWT, deleteMonitorController);

export default monitorRouter;
