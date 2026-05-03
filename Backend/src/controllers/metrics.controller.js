import logModel from '../models/logs.model.js';
import validateId from '../config/validateMongoId.js';
import mongoose from 'mongoose';

export async function getLatencyMetrics(req, res) {
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

    res.json({
      message: 'Latency metrics fetched successfully',
      success: true,
      data,
    });
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
    res.status(500).json({
      message: 'Latency fetch failed',
      success: false,
      error: error.message,
    });
  }
}

export async function getUptimeMetrics(req, res) {
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

    res.json({
      message: 'Uptime metrics fetched successfully',
      success: true,
      data: {
        uptime: Number(uptime.toFixed(2)),
        totalChecks: total,
        upChecks: up,
      },
    });
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
    res.status(500).json({
      success: false,
      message: 'Uptime fetch failed',
      error: error.message,
    });
  }
}

export async function getStatusTimeline(req, res) {
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

    res.json({
      message: 'Status timeline fetched successfully',
      success: true,
      data,
    });
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
    res.status(500).json({
      success: false,
      message: 'Timeline fetch failed',
      error: error.message,
    });
  }
}
