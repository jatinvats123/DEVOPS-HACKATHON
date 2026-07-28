import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled monitor',
    set: (value) => value?.trim() || 'Untitled monitor',
  },
  name: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  type: {
    type: String,
    enum: [
      'website',
      'api',
      'HTTP/HTTPS',
      'Ping',
      'TCP',
      'DNS',
      'http',
      'ping',
      'tcp',
      'dns',
    ],
    required: true,
    default: 'website',
  },
  url: {
    type: String,
    required: true,
  },
  interval: {
    type: Number, //How ofter to check the monitor
    default: 60, //default to check every 60 seconds
  },
  timeout: {
    type: Number, //request timeout in seconds
    default: 10, //default timeout of 10 seconds
  },
  // CONFIRMED state, debounced by the flap thresholds below. This is the field
  // that tracks incident state: it flips to DOWN only once an incident opens
  // and back to UP only once it closes, so status and incidents can never
  // disagree.
  status: {
    type: String,
    enum: ['UP', 'DOWN'],
    default: 'UP',
  },
  // RAW result of the most recent check, undebounced. Lets the dashboard show
  // "failing, not yet confirmed" during a failure streak instead of claiming
  // everything is fine right up until the incident opens.
  lastCheckStatus: {
    type: String,
    enum: ['UP', 'DOWN'],
    default: null,
  },
  lastChecked: {
    type: Date,
  },
  lastStatusCode: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },

  // --- scheduling state (durable, so a restart resumes the correct cadence) ---
  active: {
    type: Boolean,
    default: true, // paused monitors are skipped by the scheduler
  },
  nextCheckAt: {
    type: Date,
    default: Date.now, // a new monitor is due immediately
    index: true,
  },

  // --- TLS ---
  // Certificate validation is ON by default: an expired or invalid certificate
  // is an outage signal, and a monitor that ignores it is blind to a whole
  // class of real failure. Opt out per monitor for internal self-signed targets.
  ignoreTlsErrors: {
    type: Boolean,
    default: false,
  },

  // --- flap detection thresholds (per monitor, see docs/SCHEDULER.md §6) ---
  failureThreshold: {
    type: Number, // N consecutive failed checks before an incident opens
    default: 3,
    min: 1,
  },
  successThreshold: {
    type: Number, // M consecutive successful checks before it closes
    default: 2,
    min: 1,
  },
  consecutiveFailures: {
    type: Number,
    default: 0,
  },
  consecutiveSuccesses: {
    type: Number,
    default: 0,
  },

  // --- circuit breaker state (persisted so it survives restart/failover) ---
  breakerState: {
    type: String,
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    default: 'CLOSED',
  },
  breakerOpenedAt: {
    type: Date,
    default: null,
  },
  breakerRetryAt: {
    type: Date,
    default: null, // when an OPEN breaker may next probe
  },
  breakerConsecutiveOpens: {
    type: Number,
    default: 0, // drives exponential cooldown growth
  },
});

// The scheduler's hot query: "active monitors that are due, oldest first".
monitorSchema.index({ active: 1, nextCheckAt: 1 });

// Owner-scoped listing.
monitorSchema.index({ userId: 1 });

const monitorModel = mongoose.model('Monitor', monitorSchema);

export default monitorModel;
