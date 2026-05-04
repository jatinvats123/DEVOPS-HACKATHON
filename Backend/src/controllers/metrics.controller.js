import logModel from '../models/logs.model.js';
import validateId from '../config/validateMongoId.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

export const getLatencyMetrics = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;

    const logs = await logModel
      .find({ monitorId })
      .sort({ timestamp: 1 })
      .limit(100)
      .select('latency timestamp');

    const data = logs.map((l) => ({
      time: new Date(l.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      latency: l.latency ?? 0,
    }));

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Latency metrics fetched successfully'));
    /*
    example response:
    {
      "message": "Latency metrics fetched successfully",
      "success": true,
      "data": [
        { "time": "10:00 AM", "latency": 120 },
        { "time": "10:01 AM", "latency": 110 },
        ...
      ]
    }
    */
  } catch (error) {
    throw new ApiError(500, 'Latency fetch failed');
  }
});

export const getUptimeMetrics = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;

    const result = await logModel.aggregate([
      { $match: { monitorId: new mongoose.Types.ObjectId(monitorId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          up: {
            $sum: { $cond: [{ $eq: ['$status', 'UP'] }, 1, 0] },
          },
        },
      },
    ]);

    const total = result[0]?.total || 0;
    const up = result[0]?.up || 0;

    const uptime = total ? (up / total) * 100 : 0;

    const data = {
      uptime: Number(uptime.toFixed(2)),
      totalChecks: total,
      upChecks: up,
    };

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Uptime metrics fetched successfully'));
    /*
    example response:
    {
      "message": "Uptime metrics fetched successfully",
      "success": true,
      "data": {
        "uptime": 95.5,
        "totalChecks": 100,
        "upChecks": 95
      }
    }
    */
  } catch (error) {
    throw new ApiError(500, 'Uptime fetch failed');
  }
});

export const getStatusTimeline = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;

    const logs = await logModel
      .find({ monitorId })
      .sort({ timestamp: 1 })
      .limit(100)
      .select('status timestamp');

    const data = logs.map((l) => ({
      time: new Date(l.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: l.status === 'UP' ? 1 : 0,
    }));

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Status timeline fetched successfully'));
    /*
    example response:
    {
      "message": "Status timeline fetched successfully",
      "success": true,
      "data": [
        { "time": "10:00 AM", "status": 1 },
        { "time": "10:01 AM", "status": 0 },
        ...
      ]
    }
    */
  } catch (error) {
    throw new ApiError(500, 'Status timeline fetch failed');
  }
});
