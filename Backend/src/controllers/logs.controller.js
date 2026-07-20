import logModel from '../models/logs.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { assertMonitorOwned, getUserMonitorIds } from '../utils/ownership.js';

// Recent logs across the authenticated user's own monitors (dashboard feed)
export const getAllLogsController = asyncHandler(async (req, res) => {
  const monitorIds = await getUserMonitorIds(req.user?.id);

  const logs = await logModel
    .find({ monitorId: { $in: monitorIds } })
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('monitorId', 'url type title');

  res
    .status(200)
    .json(new ApiResponse(200, logs, 'Logs retrieved successfully'));
});

// Logs for one monitor — only if the requester owns it
export const monitorLogsByIdController = asyncHandler(async (req, res) => {
  const { monitorId } = req.params;
  await assertMonitorOwned(monitorId, req.user?.id);

  const logs = await logModel
    .find({ monitorId })
    .sort({ timestamp: -1 })
    .limit(200)
    .populate('monitorId', 'url type title');

  res
    .status(200)
    .json(new ApiResponse(200, logs, 'Monitor logs retrieved successfully'));
});
