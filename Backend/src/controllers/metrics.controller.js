import logModel from '../models/logs.model.js';
import validateId from '../config/validateMongoId.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { assertMonitorOwned } from '../utils/ownership.js';
import { getUptimeWindows } from '../services/uptime.service.js';

/**
 * Number of points returned to the charts. These are the MOST RECENT points:
 * the previous implementation sorted ascending and limited to 100, which meant
 * that after the first 100 checks every chart permanently displayed the oldest
 * 100 samples and never moved again.
 */
const SERIES_LIMIT = 100;

/** Newest-first from the index, then reversed so charts read left-to-right. */
async function recentLogs(monitorId, projection) {
  const rows = await logModel
    .find({ monitorId })
    .sort({ timestamp: -1 })
    .limit(SERIES_LIMIT)
    .select(projection);
  return rows.reverse();
}

const clockLabel = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const getLatencyMetrics = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;
    await assertMonitorOwned(monitorId, req.user?.id);

    const logs = await recentLogs(monitorId, 'latency timings timestamp');

    // `time` and `latency` are unchanged for the existing chart; the phase
    // breakdown is additive so nothing on the frontend breaks.
    const data = logs.map((l) => ({
      time: clockLabel(l.timestamp),
      timestamp: l.timestamp,
      latency: l.latency ?? 0,
      dns: l.timings?.dns ?? null,
      tcp: l.timings?.tcp ?? null,
      tls: l.timings?.tls ?? null,
      ttfb: l.timings?.ttfb ?? null,
      total: l.timings?.total ?? l.latency ?? null,
    }));

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Latency metrics fetched successfully'));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Latency fetch failed', error);
    throw new ApiError(500, 'Latency fetch failed');
  }
});

export const getUptimeMetrics = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;
    await assertMonitorOwned(monitorId, req.user?.id);

    const windows = await getUptimeWindows(monitorId);

    // 30d backs the legacy top-level fields: it is the closest analogue to the
    // old all-time number and matches the log retention window, so it is the
    // widest figure we can actually substantiate.
    const headline = windows['30d'];

    const data = {
      uptime: headline.uptime ?? 0,
      totalChecks: headline.totalChecks,
      upChecks: headline.upChecks,
      windows,
    };

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Uptime metrics fetched successfully'));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Uptime fetch failed', error);
    throw new ApiError(500, 'Uptime fetch failed');
  }
});

export const getStatusTimeline = asyncHandler(async (req, res) => {
  try {
    const { monitorId } = req.params;
    if (!validateId(monitorId, res)) return;
    await assertMonitorOwned(monitorId, req.user?.id);

    const logs = await recentLogs(monitorId, 'status timestamp statusCode');

    const data = logs.map((l) => ({
      time: clockLabel(l.timestamp),
      timestamp: l.timestamp,
      status: l.status === 'UP' ? 1 : 0,
      // Text label alongside the numeric one: the status dashboard must not
      // depend on colour alone (WCAG AA, Phase 7).
      label: l.status,
      statusCode: l.statusCode ?? null,
    }));

    res
      .status(200)
      .json(new ApiResponse(200, data, 'Status timeline fetched successfully'));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Status timeline fetch failed', error);
    throw new ApiError(500, 'Status timeline fetch failed');
  }
});
