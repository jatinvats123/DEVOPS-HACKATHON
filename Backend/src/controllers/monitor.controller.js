import monitorModel from '../models/monitor.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

/**
 * Fields a user may set on their own monitor. Anything outside this list
 * (status, breaker state, consecutive counters, nextCheckAt) is owned by the
 * scheduler — accepting them from a request body would let a client forge its
 * own uptime history.
 */
function pickWritableFields(body = {}) {
  const patch = {};
  const assign = (key, value) => {
    if (value !== undefined) patch[key] = value;
  };

  assign('type', body.type);
  assign('title', body.title ?? body.name);
  assign('description', body.description);
  assign('interval', body.interval);
  assign('timeout', body.timeout);
  assign('active', body.active);
  assign('ignoreTlsErrors', body.ignoreTlsErrors);

  // Flap thresholds are per monitor so a noisy target can be tuned without a
  // code change. Clamped to sane values: a threshold of 0 would mean "open an
  // incident before observing anything".
  if (body.failureThreshold !== undefined) {
    patch.failureThreshold = Math.max(1, Number(body.failureThreshold) || 1);
  }
  if (body.successThreshold !== undefined) {
    patch.successThreshold = Math.max(1, Number(body.successThreshold) || 1);
  }

  return patch;
}

const normalizeUrl = (url) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

export const createMonitorController = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    throw new ApiError(400, 'URL is required');
  }

  const normalizedUrl = normalizeUrl(url);

  const isAlreadyMonitored = await monitorModel.findOne({
    userId: req.user.id,
    url: normalizedUrl,
  });

  if (isAlreadyMonitored) {
    throw new ApiError(409, 'This URL is already being monitored');
  }

  try {
    const monitor = await monitorModel.create({
      ...pickWritableFields(req.body),
      userId: req.user.id,
      url: normalizedUrl,
      // Due immediately — a user who just added a monitor expects a result now,
      // not one interval from now.
      nextCheckAt: new Date(),
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
  const userId = req.user?.id;
  try {
    const monitors = await monitorModel.find({ userId });
    return res
      .status(200)
      .json(new ApiResponse(200, monitors, 'Monitors retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching monitors:', error);
    throw new ApiError(500, 'Internal server error');
  }
});

export const deleteMonitorController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { monitorId } = req.params;

  // Scoped delete: ownership is part of the query, so a monitor belonging to
  // another user simply does not match.
  const monitor = await monitorModel.findOneAndDelete({
    _id: monitorId,
    userId,
  });

  if (!monitor) {
    // 404 rather than 403 so we don't confirm the id exists.
    throw new ApiError(404, 'Monitor not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Monitor deleted successfully'));
});

export const updateMonitorController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { monitorId } = req.params;

  const patch = pickWritableFields(req.body);
  if (req.body.url) patch.url = normalizeUrl(req.body.url);

  // Owner-scoped in the SAME query that writes. The previous version asserted
  // ownership with a findOne and then wrote with an unscoped findByIdAndUpdate
  // — correct in practice but a time-of-check/time-of-use gap, and exactly the
  // pattern that caused the original data-exposure defect.
  const updatedMonitor = await monitorModel.findOneAndUpdate(
    { _id: monitorId, userId },
    { $set: patch },
    { new: true, runValidators: true }
  );

  if (!updatedMonitor) {
    throw new ApiError(404, 'Monitor not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedMonitor, 'Monitor updated successfully'));
});
