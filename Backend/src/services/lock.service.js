import crypto from 'node:crypto';
import os from 'node:os';
import schedulerLockModel from '../models/schedulerLock.model.js';
import { schedulerConfig } from '../config/scheduler.config.js';
import logger from '../config/logger.js';

/**
 * MongoDB TTL-backed lease lock for scheduler leader election.
 *
 * Guarantees exactly one active leader across any number of process instances,
 * which is what stops a horizontally scaled (or mid-rolling-deploy) deployment
 * from sending every customer duplicate checks, duplicate incidents and
 * duplicate alert emails.
 *
 * See docs/SCHEDULER.md §2 for the design rationale — in particular why the TTL
 * index is garbage collection and NOT the correctness mechanism.
 */

/** Stable-ish, unique-per-process identity, useful in logs during failover. */
export const INSTANCE_ID = `${os.hostname()}:${process.pid}:${crypto
  .randomBytes(4)
  .toString('hex')}`;

export class SchedulerLock {
  constructor({
    lockId = schedulerConfig.LOCK_ID,
    ttlMs = schedulerConfig.LOCK_TTL_MS,
    owner = INSTANCE_ID,
    model = schedulerLockModel,
  } = {}) {
    this.lockId = lockId;
    this.ttlMs = ttlMs;
    this.owner = owner;
    this.model = model;
    this.isLeader = false;
  }

  /**
   * Acquire the lease, or renew it if we already hold it.
   *
   * A single atomic `findOneAndUpdate` upsert. The filter matches only when the
   * existing lease has expired OR we are already the owner, so a live lease held
   * by another instance is never stolen. Atomicity rests on the unique `_id`
   * index: two instances racing the same upsert cannot both succeed — the loser
   * gets a duplicate-key error, which we treat as "someone else is leader".
   *
   * Note the expiry comparison is done against `now` in the QUERY. We never wait
   * for MongoDB's TTL sweeper to physically delete the document; that runs about
   * once a minute and would stall failover for that long.
   *
   * @returns {Promise<boolean>} true if this instance now holds the lease
   */
  async acquire() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    try {
      const doc = await this.model.findOneAndUpdate(
        {
          _id: this.lockId,
          $or: [{ expiresAt: { $lte: now } }, { owner: this.owner }],
        },
        {
          $set: { owner: this.owner, expiresAt, heartbeatAt: now },
          $setOnInsert: { acquiredAt: now },
        },
        { upsert: true, returnDocument: 'after' }
      );

      const held = doc?.owner === this.owner;
      if (held && !this.isLeader) {
        logger.info(`[scheduler] acquired leadership (owner=${this.owner})`);
      }
      this.isLeader = held;
      return held;
    } catch (err) {
      // E11000: another instance won the upsert race for the same _id. That is
      // a normal, expected outcome of contention — not an error worth shouting
      // about. Any other failure means we cannot prove we hold the lease, so we
      // must assume we do not.
      if (err?.code !== 11000) {
        logger.error(`[scheduler] lock acquisition failed: ${err.message}`);
      }
      if (this.isLeader) {
        logger.warn(`[scheduler] lost leadership (owner=${this.owner})`);
      }
      this.isLeader = false;
      return false;
    }
  }

  /**
   * Release the lease on graceful shutdown so a standby can take over
   * immediately instead of waiting out the full TTL.
   *
   * Scoped by owner: a leader that already lost its lease must never delete the
   * new leader's document.
   */
  async release() {
    if (!this.isLeader) return;
    this.isLeader = false;
    try {
      await this.model.deleteOne({ _id: this.lockId, owner: this.owner });
      logger.info(`[scheduler] released leadership (owner=${this.owner})`);
    } catch (err) {
      // Worst case we simply wait out the TTL — the lease is self-healing.
      logger.error(`[scheduler] lock release failed: ${err.message}`);
    }
  }
}

export default SchedulerLock;
