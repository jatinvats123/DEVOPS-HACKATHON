import incidentModel from '../models/incidents.model';

export async function createIncident(monitorId, reason) {
  const existingIncident = await incidentModel.findOne({
    monitorId,
    status: 'ONGOING',
  });

  if (existingIncident) {
    return existingIncident;
  }

  const newIncident = await incidentModel.create({
    monitorId,
    startTime: new Date(),
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

  ongoingIncident.status = 'RESOLVED';
  ongoingIncident.endTime = new Date();
  ongoingIncident.duration = Math.floor(
    (ongoingIncident.endTime - ongoingIncident.startTime) / 1000
  ); // Duration in seconds
  await ongoingIncident.save();
  return ongoingIncident;
}
