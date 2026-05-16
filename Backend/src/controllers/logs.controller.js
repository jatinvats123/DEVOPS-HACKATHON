import logModel from '../models/logs.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

// Get all recent logs for dashboard
export const getAllLogsController = asyncHandler(async (req, res) => {
  try {
    const logs = await logModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('monitorId', 'url type name');

    if (!logs) {
      return res.status(404).json(new ApiError(404, 'No logs found'));
    }

    res
      .status(200)
      .json(new ApiResponse(200, logs, 'Logs retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json(new ApiError(500, 'Internal server error'));
  }
});

export const monitorLogsByIdController = asyncHandler(async (req, res) => {
  //   const userId = req.user?.id;
  const monitorId = req.params.monitorId;

  try {
    const logs = await logModel
      .find({ monitorId })
      .populate('monitorId', 'url type')
      .sort({ createdAt: -1 });

    if (!logs) {
      return res
        .status(404)
        .json(new ApiError(404, 'No logs found for this monitor'));
    }

    res
      .status(200)
      .json(new ApiResponse(200, logs, 'Monitor logs retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching monitor logs:', error);
    res.status(500).json(new ApiError(500, 'Internal server error'));
  }
});
