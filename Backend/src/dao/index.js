import mongoose from 'mongoose';
import monitorModel from '../models/monitor.model.js';
import incidentModel from '../models/incidents.model.js';
import logModel from '../models/logs.model.js';
import channelModel from '../models/channel.model.js';
import notificationLogModel from '../models/notificationLog.model.js';
import statusPageModel from '../models/statusPage.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ScopedDao } from './scopedDao.js';

/**
 * The application's owner-scoped data access objects.
 *
 * Controllers must go through these rather than touching a model directly.
 * See scopedDao.js for why the default is inverted.
 */

/** Monitor ids owned by a user — the basis of derived scoping. */
async function ownedMonitorIds(ownerId) {
  return monitorModel.find({ userId: ownerId }).distinct('_id');
}

/**
 * Logs and incidents carry no owner field of their own; they belong to whoever
 * owns their monitor.
 *
 * Scoping through monitor ownership rather than a denormalised `userId` is a
 * deliberate trade-off: it costs one extra query, but it is correct for rows
 * written before the denormalisation existed. A `userId`-based scope would have
 * silently hidden every historical log and incident from its rightful owner —
 * a data-loss-shaped bug wearing a security fix's clothing.
 */
const byMonitorOwnership = async (ownerId) => ({
  monitorId: { $in: await ownedMonitorIds(ownerId) },
});

export const monitorDao = new ScopedDao(monitorModel, {
  ownerField: 'userId',
});

export const channelDao = new ScopedDao(channelModel, {
  ownerField: 'userId',
});

export const notificationLogDao = new ScopedDao(notificationLogModel, {
  ownerField: 'userId',
});

/**
 * Status pages are owner-scoped for every MANAGEMENT operation.
 *
 * The public read path deliberately does not go through this DAO — it has no
 * owner to scope by. It looks pages up by slug directly and projects a
 * hand-picked subset of fields; see status.controller.js.
 */
export const statusPageDao = new ScopedDao(statusPageModel, {
  ownerField: 'userId',
});

export const incidentDao = new ScopedDao(incidentModel, {
  resolveScope: byMonitorOwnership,
});

export const logDao = new ScopedDao(logModel, {
  resolveScope: byMonitorOwnership,
});

/**
 * Assert a monitor exists AND belongs to the caller, returning it.
 *
 * Throws 404 rather than 403 for a monitor owned by someone else: a 403 would
 * confirm the id is real, which is itself a disclosure.
 */
export async function assertMonitorOwned(ownerId, monitorId) {
  if (!mongoose.isValidObjectId(monitorId)) {
    throw new ApiError(404, 'Monitor not found');
  }
  const monitor = await monitorDao.findById(ownerId, monitorId);
  if (!monitor) throw new ApiError(404, 'Monitor not found');
  return monitor;
}

export { ScopedDao, ownedMonitorIds };
export { UnscopedQueryError } from './scopedDao.js';
