import incidentModel from '../models/incidents.model.js';
import { UserService } from './user.service.js';
import { analyzeIncident } from './ai.services.js';
import { sendEmail } from './sendEmail.js';
import logger from '../config/logger.js';
import monitorModel from '../models/monitor.model.js';
import Alert from '../models/alert.model.js';
import AlertHistory from '../models/alertHistory.model.js';

async function dispatchAlerts(userId, monitorId, incidentId, title, message) {
  try {
    const channels = await Alert.find({ userId, isActive: true });
    
    // Always include primary email if no channels are configured
    if (channels.length === 0) {
      const user = await UserService.findUserByIdWithoutPassword(userId);
      if (user?.email) {
        await sendEmail({
          email: user.email,
          subject: title,
          html: message,
        });
        await AlertHistory.create({
          userId,
          monitorId,
          incidentId,
          channelType: 'email',
          target: user.email,
          status: 'SENT',
          message: title
        });
      }
      return;
    }

    for (const channel of channels) {
      try {
        if (channel.type === 'email') {
          await sendEmail({
            email: channel.target,
            subject: title,
            html: message,
          });
        }
        // Handle Slack/Webhook dispatch here if needed
        
        await AlertHistory.create({
          userId,
          monitorId,
          incidentId,
          channelType: channel.type,
          target: channel.target,
          status: 'SENT',
          message: title
        });
      } catch (err) {
        logger.error(`Failed to dispatch alert to ${channel.type}:`, err);
        await AlertHistory.create({
          userId,
          monitorId,
          incidentId,
          channelType: channel.type,
          target: channel.target,
          status: 'FAILED',
          error: err.message
        });
      }
    }
  } catch (error) {
    logger.error('Error in dispatchAlerts:', error);
  }
}

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

  try {
    const monitor = await monitorModel.findById(monitorId);
    if (monitor?.userId) {
      const user = await UserService.findUserByIdWithoutPassword(monitor.userId);
      const emailContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Incident Alert</title></head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <tr><td style="background:#ef4444; color:#ffffff; padding:20px; text-align:center;"><h2 style="margin:0;">🚨 Incident Detected</h2></td></tr>
        <tr><td style="padding:20px; color:#333;">
          <p style="font-size:16px;">Hello <strong>${user?.username || 'User'}</strong>,</p>
          <p style="font-size:15px;">An issue has been detected with your monitored service: <strong>${monitor?.title}</strong></p>
          <p><strong>Reason:</strong> ${reason}</p>
          <div style="background:#f9fafb; border-left:4px solid #6366f1; padding:15px; border-radius:6px;">
            <p style="margin:0; font-weight:bold;">🤖 AI Analysis</p>
            <p style="margin-top:8px; font-size:14px; color:#555;">${aiSummary}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      
      await dispatchAlerts(
        monitor.userId, 
        monitorId, 
        newIncident._id, 
        `🚨 Incident Detected: ${monitor.title}`, 
        emailContent
      );
    }
  } catch (error) {
    logger.error('Error dispatching incident alerts:', error);
  }

  return newIncident;
}

export async function resolveIncident(monitorId) {
  const ongoingIncident = await incidentModel.findOne({
    monitorId,
    status: 'ONGOING',
  });

  if (!ongoingIncident) return null;

  const resolvedIncident = await incidentModel.create({
    monitorId,
    status: 'RESOLVED',
    startTime: ongoingIncident.startTime,
    endTime: new Date(),
    reason: `Resolved: ${ongoingIncident.reason}`,
    aiSummary: 'Issue resolved. Monitor is back up.',
    duration: Math.floor((new Date() - ongoingIncident.startTime) / 1000),
  });

  try {
    const monitor = await monitorModel.findById(monitorId);
    if (monitor?.userId) {
      const user = await UserService.findUserByIdWithoutPassword(monitor.userId);
      const emailContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>Issue Resolved</title></head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <tr><td style="background:#22c55e; color:#ffffff; padding:20px; text-align:center;"><h2 style="margin:0;">✅ Issue Resolved</h2></td></tr>
        <tr><td style="padding:20px; color:#333;">
          <p style="font-size:16px;">Hello <strong>${user?.username || 'User'}</strong>,</p>
          <p style="font-size:15px;">Good news! 🎉 Your service <strong>${monitor.title}</strong> is back online.</p>
          <p><strong>Downtime:</strong> ${resolvedIncident.duration}s</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await dispatchAlerts(
        monitor.userId, 
        monitorId, 
        resolvedIncident._id, 
        `✅ Issue Resolved: ${monitor.title}`, 
        emailContent
      );
    }
  } catch (error) {
    logger.error('Error dispatching resolution alerts:', error);
  }

  return resolvedIncident;
}
