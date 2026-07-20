import channelModel from '../models/channel.model.js';
import notificationLogModel from '../models/notificationLog.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from '../services/sendEmail.js';
import logger from '../config/logger.js';

const TYPES = ['Email', 'Slack', 'Webhook', 'SMS'];

export const listChannels = asyncHandler(async (req, res) => {
  const channels = await channelModel
    .find({ userId: req.user.id })
    .sort({ createdAt: 1 });
  res
    .status(200)
    .json(new ApiResponse(200, channels, 'Channels retrieved successfully'));
});

export const createChannel = asyncHandler(async (req, res) => {
  const { type, target } = req.body;

  if (!target || !String(target).trim()) {
    throw new ApiError(400, 'Target is required');
  }
  if (type && !TYPES.includes(type)) {
    throw new ApiError(400, `Type must be one of: ${TYPES.join(', ')}`);
  }
  if ((type || 'Email') === 'Email' && !/^\S+@\S+\.\S+$/.test(target)) {
    throw new ApiError(400, 'Enter a valid email address');
  }

  const exists = await channelModel.findOne({
    userId: req.user.id,
    type: type || 'Email',
    target: String(target).trim(),
  });
  if (exists) throw new ApiError(409, 'That channel already exists');

  const channel = await channelModel.create({
    userId: req.user.id,
    type: type || 'Email',
    target: String(target).trim(),
  });

  res
    .status(201)
    .json(new ApiResponse(201, channel, 'Channel created successfully'));
});

export const updateChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const update = {};
  if (typeof req.body.active === 'boolean') update.active = req.body.active;
  if (req.body.target) update.target = String(req.body.target).trim();
  if (req.body.type) {
    if (!TYPES.includes(req.body.type)) throw new ApiError(400, 'Invalid type');
    update.type = req.body.type;
  }

  const channel = await channelModel.findOneAndUpdate(
    { _id: channelId, userId: req.user.id },
    update,
    { new: true }
  );
  if (!channel) throw new ApiError(404, 'Channel not found');

  res
    .status(200)
    .json(new ApiResponse(200, channel, 'Channel updated successfully'));
});

export const deleteChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const channel = await channelModel.findOneAndDelete({
    _id: channelId,
    userId: req.user.id,
  });
  if (!channel) throw new ApiError(404, 'Channel not found');

  res
    .status(200)
    .json(new ApiResponse(200, channel, 'Channel deleted successfully'));
});

// Send a real test message so the user can confirm the channel works
export const testChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const channel = await channelModel.findOne({
    _id: channelId,
    userId: req.user.id,
  });
  if (!channel) throw new ApiError(404, 'Channel not found');

  let status = 'Delivered';
  let detail = 'Test dispatch sent';

  try {
    if (channel.type === 'Email') {
      await sendEmail({
        email: channel.target,
        subject: 'WatchTower test notification',
        html: `<p>This is a test notification from WatchTower.</p>
               <p>If you received this, your <strong>${channel.type}</strong> channel is configured correctly.</p>`,
      });
    } else {
      status = 'Skipped';
      detail = `${channel.type} delivery is not configured on this deployment`;
    }
  } catch (err) {
    logger.error('Test dispatch failed:', err);
    status = 'Failed';
    detail = err?.message || 'Dispatch failed';
  }

  await notificationLogModel.create({
    userId: req.user.id,
    event: 'TEST_DISPATCH',
    channel: channel.type,
    target: channel.target,
    status,
    detail,
  });

  if (status === 'Failed') throw new ApiError(502, detail);

  res.status(200).json(new ApiResponse(200, { status, detail }, detail));
});

// Transmission Log — real dispatch history for this user
export const listNotificationLogs = asyncHandler(async (req, res) => {
  const logs = await notificationLogModel
    .find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('monitorId', 'title url');

  res
    .status(200)
    .json(new ApiResponse(200, logs, 'Notification logs retrieved successfully'));
});
