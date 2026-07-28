import mongoose from 'mongoose';
import { schedulerConfig } from '../config/scheduler.config.js';

/**
 * Per-check time-series. One document per completed check.
 *
 * Two things this collection previously lacked and now has:
 *  - a TTL, so it cannot grow without bound;
 *  - an index on (monitorId, timestamp), so dashboard queries stop being full
 *    collection scans.
 */

/**
 * Real connection-phase timings, in milliseconds, measured from the underlying
 * socket rather than inferred. Any phase can be null when it does not apply or
 * is not observable: `dns` is null for an IP literal or a cached lookup, `tls`
 * is null for plain HTTP, and everything but `total` is null when the failure
 * happened before that phase was reached.
 */
const timingsSchema = new mongoose.Schema(
  {
    dns: { type: Number, default: null }, // hostname resolution
    tcp: { type: Number, default: null }, // TCP handshake
    tls: { type: Number, default: null }, // TLS handshake (https only)
    ttfb: { type: Number, default: null }, // time to first response byte
    total: { type: Number, default: null }, // full request incl. body
  },
  { _id: false }
);

const logSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN', 'DEGRADED'],
  },
  // Kept as the headline number (total round-trip) for backward compatibility
  // with existing dashboard queries; `timings.total` carries the same value.
  latency: {
    type: Number,
  },
  timings: {
    type: timingsSchema,
    default: () => ({}),
  },
  statusCode: {
    type: Number,
  },
  error: {
    type: String,
  },
  // How many HTTP attempts this check consumed (1 = succeeded first try).
  attempts: {
    type: Number,
    default: 1,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Serves every dashboard query: latency series, status timeline, uptime windows.
logSchema.index({ monitorId: 1, timestamp: -1 });

// Retention. Set to the widest uptime window we advertise (30d) so we never
// display a window we cannot fully back with data.
logSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: schedulerConfig.LOG_RETENTION_DAYS * 24 * 60 * 60 }
);

const logModel = mongoose.model('Log', logSchema);

export default logModel;
