import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { logDao, assertMonitorOwned } from '../dao/index.js';

// Recent logs across the authenticated user's own monitors (dashboard feed)
export const getAllLogsController = asyncHandler(async (req, res) => {
  const logs = await logDao.find(
    req.user?.id,
    {},
    {
      sort: { timestamp: -1 },
      limit: 10,
      populate: { path: 'monitorId', select: 'url type title' },
    }
  );

  res
    .status(200)
    .json(new ApiResponse(200, logs, 'Logs retrieved successfully'));
});

// Logs for one monitor — only if the requester owns it
export const monitorLogsByIdController = asyncHandler(async (req, res) => {
  const { monitorId } = req.params;
  await assertMonitorOwned(req.user?.id, monitorId);

  const logs = await logDao.find(
    req.user?.id,
    { monitorId },
    {
      sort: { timestamp: -1 },
      limit: 200,
      populate: { path: 'monitorId', select: 'url type title' },
    }
  );

  res
    .status(200)
    .json(new ApiResponse(200, logs, 'Monitor logs retrieved successfully'));
});
