import express from 'express';
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  testChannel,
  listNotificationLogs,
} from '../controllers/channel.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const ChannelRouter = express.Router();

// Transmission log (must be declared before /:channelId)
ChannelRouter.get('/logs', verifyJWT, listNotificationLogs);

ChannelRouter.get('/', verifyJWT, listChannels);
ChannelRouter.post('/', verifyJWT, createChannel);
ChannelRouter.patch('/:channelId', verifyJWT, updateChannel);
ChannelRouter.delete('/:channelId', verifyJWT, deleteChannel);
ChannelRouter.post('/:channelId/test', verifyJWT, testChannel);

export default ChannelRouter;
