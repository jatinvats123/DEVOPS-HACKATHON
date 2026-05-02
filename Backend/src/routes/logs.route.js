import express from 'express';
// import { verifyJWT } from '../middlewares/auth.middleware';
import { monitorLogsByIdController } from '../controllers/logs.controller.js';
const LogsRouter = express.Router();

/*
@route GET /api/logs/:monitorId
@desc Get logs for a specific monitor
@access Private
*/
LogsRouter.get('/:monitorId', monitorLogsByIdController);

export default LogsRouter;
