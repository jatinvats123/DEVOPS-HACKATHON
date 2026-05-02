import express from 'express';
// import { verifyJWT } from '../middlewares/auth.middleware';
const LogsRouter = express.Router();

/*
@route GET /api/logs/:monitorId
@desc Get logs for a specific monitor
@access Private
*/
LogsRouter.get('/:monitorId', monitorLogsByIdController);

export default LogsRouter;
