import incidentModel from '../models/incidents.model.js';
import { analyzeIncident } from './ai.services.js';

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
