import monitorModel from '../models/monitor.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

export const createMonitorController = asyncHandler(async (req, res) => {
  try {
    const { type, url, interval, timeout, title, name, description } = req.body;

    //Basic validation
    if (!url) {
      throw new ApiError(400, 'URL is required');
    }

    const isAlreadyMonitored = await monitorModel.findOne({
      userId: req.user.id,
      url,
    });

    if (isAlreadyMonitored) {
      throw new ApiError(409, 'This URL is already being monitored');
    }

    //Normalize URL (ensure it starts with http:// or https://)
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      normalizedUrl = 'https://' + url;
    }

    //Monitor creation logic
    const monitor = await monitorModel.create({
      userId: req.user.id, // Assuming user ID is available in req.user after authentication
      type,
      title: title || name, // Support both title and name from frontend
      url: normalizedUrl,
      interval,
      timeout,
      description,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, monitor, 'Monitor created successfully'));
  } catch (error) {
    logger.error('Error creating monitor:', error);
    throw new ApiError(500, 'Internal server error');
  }
});

export const getAllMonitorsController = asyncHandler(async (req, res) => {
  const userId = req.user?.id; // Assuming user ID is available in req.user after authentication
  try {
    const monitors = await monitorModel.find({ userId }); // Fetch monitors for the authenticated user
    return res
      .status(200)
      .json(new ApiResponse(200, monitors, 'Monitors retrieved successfully'));
  } catch {
    throw new ApiError(500, 'Internal server error');
  }
});

export const deleteMonitorController = asyncHandler(async (req, res) => {
  const userId = req.user?.id; // Assuming user ID is available in req.user after authentication
  const monitorId = req.params.monitorId;

  try {
    logger.info(
      `Attempting to delete monitor: ${monitorId} for user: ${userId}`
    );
    const monitor = await monitorModel.findOneAndDelete({
      _id: monitorId,
      userId,
    });

    if (!monitor) {
      logger.info(
        `Monitor ${monitorId} not found or not owned by user ${userId}`
      );
      throw new ApiError(404, 'Monitor not found or not owned by user');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, 'Monitor deleted successfully'));
  } catch {
    return res.status(500).json(new ApiError(500, 'Internal server error'));
  }
});

export const updateMonitorController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const monitorId = req.params.monitorId;
  const { type, url, interval, timeout, title, description } = req.body;
  try {
    const monitor = await monitorModel.findOne({ _id: monitorId, userId });

    if (!monitor) {
      throw new ApiError(404, 'Monitor not found or not owned by user');
    }

    // Normalize URL if provided
    let normalizedUrl = url;
    if (url && !/^https?:\/\//i.test(url)) {
      normalizedUrl = 'https://' + url;
    }

    // Update the monitor
    const updatedMonitor = await monitorModel.findByIdAndUpdate(
      monitorId,
      {
        type,
        url: normalizedUrl,
        interval,
        timeout,
        title,
        description,
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedMonitor, 'Monitor updated successfully')
      );
  } catch (error) {
    logger.error('Error updating monitor:', error);
    throw new ApiError(500, 'Internal server error');
  }
});
