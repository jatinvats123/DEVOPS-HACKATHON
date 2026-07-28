import incidentModel from '../models/incidents.model.js';
import { UserService } from './user.service.js';
import { analyzeIncident } from './ai.services.js';
import logger from '../config/logger.js';
import { notifierRegistry, IncidentEvent } from '../notifications/index.js';

/**
 * Incident lifecycle.
 *
 * Two properties this module is responsible for:
 *
 *  1. **Exactly-once transitions.** Opening and closing are edge-triggered and
 *     idempotent. The previous implementation called `createIncident` on every
 *     DOWN→DOWN check and relied on a `findOne({status:'ONGOING'})` read to
 *     swallow the duplicate — a read-then-write race that also meant the
 *     expensive AI summary was computed on every failing check.
 *
 *  2. **No transport knowledge.** Delivery is entirely behind the notifier
 *     registry. This file no longer knows that email exists.
 *
 * Flap thresholds (how many consecutive failures/successes are required) are
 * evaluated by the scheduler, which owns the counters. This module is called
 * only once a threshold has actually been crossed.
 */

/**
 * Load the owner of a monitor. Notifications need the email and preferences;
 * the incident needs the id denormalised onto it.
 */
async function loadOwner(monitor) {
  const userId = monitor?.userId;
  if (!userId) {
    logger.warn(`[incident] monitor ${monitor?._id} has no userId`);
    return null;
  }
  try {
    return await UserService.findUserByIdWithoutPassword(userId);
  } catch (err) {
    logger.error(`[incident] could not load owner ${userId}: ${err.message}`);
    return null;
  }
}

/**
 * Open an incident for a monitor whose failure threshold has been crossed.
 *
 * @param {object} monitor  the monitor document (must include userId)
 * @param {string} reason
 * @returns {Promise<{incident: object, opened: boolean}>}
 *   `opened` is false when an incident was already ongoing — the caller can
 *   rely on it to know whether a transition actually occurred.
 */
export async function openIncident(monitor, reason) {
  const monitorId = monitor?._id;
  const startTime = new Date();

  // Atomic upsert keyed on the ongoing incident. `$setOnInsert` means an
  // already-open incident is returned untouched, so we never overwrite the
  // original reason or restart the clock on an outage in progress.
  let incident;
  let created;
  try {
    const result = await incidentModel.findOneAndUpdate(
      { monitorId, status: 'ONGOING' },
      {
        $setOnInsert: {
          monitorId,
          userId: monitor.userId,
          status: 'ONGOING',
          startTime,
          reason,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        includeResultMetadata: true,
      }
    );
    incident = result.value;
    created = !result.lastErrorObject?.updatedExisting;
  } catch (err) {
    if (err?.code === 11000) {
      // Lost the race against the partial unique index — another writer opened
      // it first. Their incident is the canonical one and they will notify.
      logger.warn(
        `[incident] concurrent open for monitor ${monitorId}, deferring`
      );
      const existing = await incidentModel.findOne({
        monitorId,
        status: 'ONGOING',
      });
      return { incident: existing, opened: false };
    }
    throw err;
  }

  if (!created) return { incident, opened: false };

  // Only now — on a genuine transition — do the expensive/optional work.
  try {
    const aiSummary = await analyzeIncident(reason);
    if (aiSummary) {
      incident.aiSummary = aiSummary;
      await incident.save();
    }
  } catch (err) {
    // A missing AI summary is cosmetic; it must never block the alert.
    logger.error(`[incident] AI analysis failed: ${err.message}`);
  }

  const user = await loadOwner(monitor);
  if (user) {
    await notifierRegistry.dispatch({
      event: IncidentEvent.OPENED,
      incident,
      monitor,
      user,
      occurredAt: startTime,
    });
  }

  logger.info(
    `[incident] OPENED for monitor ${monitorId} (${monitor.url}): ${reason}`
  );
  return { incident, opened: true };
}

/**
 * Close the ongoing incident for a monitor whose success threshold has been met.
 *
 * @returns {Promise<{incident: object|null, closed: boolean}>}
 */
export async function closeIncident(monitor) {
  const monitorId = monitor?._id;
  const endTime = new Date();

  // Single atomic transition from ONGOING to RESOLVED. Whoever's update matches
  // is the one that closed it; a second caller matches nothing and returns
  // closed:false, which is what makes "notify exactly once" hold.
  const incident = await incidentModel.findOneAndUpdate(
    { monitorId, status: 'ONGOING' },
    { $set: { status: 'RESOLVED', endTime } },
    { new: true }
  );

  if (!incident) return { incident: null, closed: false };

  // `duration` is derived in the pre('save') hook, which findOneAndUpdate
  // bypasses — compute and persist it explicitly.
  incident.duration = Math.max(
    0,
    Math.floor((endTime - incident.startTime) / 1000)
  );
  await incident.save();

  const user = await loadOwner(monitor);
  if (user) {
    await notifierRegistry.dispatch({
      event: IncidentEvent.CLOSED,
      incident,
      monitor,
      user,
      occurredAt: endTime,
    });
  }

  logger.info(
    `[incident] CLOSED for monitor ${monitorId} (${monitor.url}) after ${incident.duration}s`
  );
  return { incident, closed: true };
}

export default { openIncident, closeIncident };
