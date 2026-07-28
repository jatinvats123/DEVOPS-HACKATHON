import mongoose from 'mongoose';
import logModel from '../models/logs.model.js';

/**
 * Uptime aggregation over rolling windows.
 *
 * Computed entirely inside MongoDB with a single `$facet` — one round trip,
 * three windows, no documents pulled into application memory. The previous
 * implementation grouped the *entire* history of a monitor with no time bound
 * and reported a single all-time number, which is both unbounded work and the
 * least useful statistic on the page: an outage six months ago should not still
 * be dragging down today's figure.
 */

export const WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** Shared group stage — one pass, all the numbers a window needs. */
const groupStage = {
  $group: {
    _id: null,
    total: { $sum: 1 },
    up: { $sum: { $cond: [{ $eq: ['$status', 'UP'] }, 1, 0] } },
    // Latency is averaged over successful checks only. Including failures would
    // mix "responded in 80ms" with "timed out after 10s" and produce a number
    // that describes neither.
    avgLatency: {
      $avg: {
        $cond: [{ $eq: ['$status', 'UP'] }, '$latency', null],
      },
    },
    lastCheckAt: { $max: '$timestamp' },
  },
};

/**
 * @param {string|ObjectId} monitorId
 * @param {Date} [now] injectable for deterministic tests
 * @returns {Promise<Object>} one entry per window
 */
export async function getUptimeWindows(monitorId, now = new Date()) {
  const id = new mongoose.Types.ObjectId(String(monitorId));
  const nowMs = now.getTime();

  const since = Object.fromEntries(
    Object.entries(WINDOWS).map(([key, ms]) => [key, new Date(nowMs - ms)])
  );

  const facet = Object.fromEntries(
    Object.keys(WINDOWS).map((key) => [
      key,
      [{ $match: { timestamp: { $gte: since[key] } } }, groupStage],
    ])
  );

  const [raw] = await logModel.aggregate([
    // Bound the scan by the widest window up front so the compound index
    // (monitorId, timestamp) does the work and the facets only re-filter a
    // small, already-narrowed set.
    { $match: { monitorId: id, timestamp: { $gte: since['30d'] } } },
    { $facet: facet },
  ]);

  return Object.fromEntries(
    Object.keys(WINDOWS).map((key) => {
      const bucket = raw?.[key]?.[0];
      const total = bucket?.total ?? 0;
      const up = bucket?.up ?? 0;

      return [
        key,
        {
          // null, NOT 100, when there is no data. "We never checked" and "it was
          // perfectly healthy" are different claims, and a dashboard that
          // conflates them is lying to whoever is on call.
          uptime: total > 0 ? Number(((up / total) * 100).toFixed(3)) : null,
          totalChecks: total,
          upChecks: up,
          downChecks: total - up,
          avgLatencyMs:
            bucket?.avgLatency != null ? Math.round(bucket.avgLatency) : null,
          lastCheckAt: bucket?.lastCheckAt ?? null,
          windowStart: since[key],
        },
      ];
    })
  );
}

export default { getUptimeWindows, WINDOWS };
