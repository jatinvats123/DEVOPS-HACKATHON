import express from 'express';
import { monitorLogsByIdController, getAllLogsController } from '../controllers/logs.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const LogsRouter = express.Router();

/*
@route GET /api/logs
@desc Get all recent logs
@access Private
*/
LogsRouter.get('/', verifyJWT, getAllLogsController);

/*
@route GET /api/logs/:monitorId
@desc Get logs for a specific monitor
@access Private
*/
LogsRouter.get('/:monitorId', verifyJWT, monitorLogsByIdController);

export default LogsRouter;
