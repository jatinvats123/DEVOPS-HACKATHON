import incidentModel from '../models/incidents.model.js';
import { UserService } from './user.service.js';
import { analyzeIncident } from './ai.services.js';
import { sendEmail } from './sendEmail.js';
import logger from '../config/logger.js';

export async function createIncident(monitorId, reason) {
  const existingIncident = await incidentModel.findOne({
    monitorId,
    status: 'ONGOING',
  });

  if (existingIncident) return existingIncident;

  const aiSummary = await analyzeIncident(reason);

  const newIncident = await incidentModel.create({
    monitorId,
    startTime: new Date(),
    aiSummary,
    reason,
  });

  // Send email notification to the user associated with the monitor
  try {
    // populate only what you need
    await newIncident.populate({
      path: 'monitorId',
      select: 'userId',
    });

    const userId = newIncident?.monitorId?.userId;

    if (!userId) {
      logger.warn('UserId not found for monitor:', monitorId);
      return;
    }

    const user = await UserService.findUserByIdWithoutPassword(userId);

    if (!user || !user.email) {
      logger.warn('User or email not found for userId:', userId);
      return;
    }

    await sendEmail({
      email: user.email,
      subject: 'New Incident Detected',
      message: `An incident has been detected for monitor ${monitorId}.

Reason: ${reason}.

AI Analysis: ${aiSummary}`,
    });

    logger.info(`Email sent successfully to user: ${user.email}`);
  } catch (error) {
    logger.error('Error sending incident email:', error);
  }

  return newIncident;
}

export async function resolveIncident(monitorId) {
  const ongoingIncident = await incidentModel.findOne({
    monitorId,
    status: 'ONGOING',
  });

  if (!ongoingIncident) {
    return null;
  }

  const resolvedIncident = await incidentModel.create({
    monitorId,
    status: 'RESOLVED',
    startTime: ongoingIncident.startTime,
    endTime: new Date(),
    reason: `Resolved: ${ongoingIncident.reason}`,
    aiSummary: 'Issue resolved. Monitor is back up.',
    duration: Math.floor((new Date() - ongoingIncident.startTime) / 1000), // Duration in seconds
  });

  // Alternatively, you can update the existing incident instead of creating a new one:
  // ongoingIncident.status = 'RESOLVED';
  // ongoingIncident.aiSummary = 'Issue resolved. Monitor is back up.';
  // ongoingIncident.reason = `Resolved: ${ongoingIncident.reason}`;
  // ongoingIncident.endTime = new Date();
  // ongoingIncident.duration = Math.floor(
  //   (ongoingIncident.endTime - ongoingIncident.startTime) / 1000
  // ); // Duration in seconds
  // await ongoingIncident.save();

  return resolvedIncident;
}
