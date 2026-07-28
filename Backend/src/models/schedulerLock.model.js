import mongoose from 'mongoose';

/**
 * Lease lock backing scheduler leader election.
 *
 * Exactly one document exists (`_id: 'monitor-scheduler'`). The unique `_id`
 * index is what makes acquisition atomic: two instances racing on the same
 * upsert cannot both win.
 *
 * The TTL index below is GARBAGE COLLECTION ONLY. MongoDB's TTL monitor sweeps
 * roughly once a minute, so an expired document can linger well past its
 * `expiresAt`. Correctness comes from comparing `expiresAt` inside the
 * acquisition query (see lock.service.js) — never from the document having been
 * physically removed. Waiting on TTL deletion would stall failover for up to a
 * minute.
 */
const schedulerLockSchema = new mongoose.Schema(
  {
    _id: { type: String },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acquiredAt: { type: Date, default: Date.now },
    heartbeatAt: { type: Date, default: Date.now },
  },
  { versionKey: false, _id: false }
);

// Sweep abandoned locks so the collection cannot accumulate junk. Correctness
// does not depend on this firing promptly.
schedulerLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const schedulerLockModel = mongoose.model(
  'SchedulerLock',
  schedulerLockSchema,
  'scheduler_locks'
);

export default schedulerLockModel;
