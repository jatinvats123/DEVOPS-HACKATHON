import monitorModel from '../models/monitor.model.js';
import { ApiError } from './ApiError.js';

/**
 * IDs of every monitor owned by a user. Used to scope "all logs / all
 * incidents" queries so one user can never read another user's data.
 */
export const getUserMonitorIds = async (userId) => {
  if (!userId) return [];
  return monitorModel.find({ userId }).distinct('_id');
};

/**
 * Ensure a monitor exists AND belongs to the requesting user.
 * Throws 404 (not 403) so we don't leak whether the id exists.
 * @returns {Promise<object>} the monitor document
 */
export const assertMonitorOwned = async (monitorId, userId) => {
  const monitor = await monitorModel.findOne({ _id: monitorId, userId });
  if (!monitor) {
    throw new ApiError(404, 'Monitor not found');
  }
  return monitor;
};
