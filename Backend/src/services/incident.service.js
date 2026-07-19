import incidentModel from '../models/incidents.model.js';
import { UserService } from './user.service.js';
import { analyzeIncident } from './ai.services.js';
import { sendEmail } from './sendEmail.js';
import logger from '../config/logger.js';
import monitorModel from '../models/monitor.model.js';

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
      select: 'title',
      select: 'userId',
    });

    const userId = newIncident?.monitorId?.userId;

    if (!userId) {
      logger.warn('UserId not found for monitor:', monitorId);
      return;
    }

    const user = await UserService.findUserByIdWithoutPassword(userId);
    const monitor = await monitorModel.findById(monitorId);

    if (!user || !user.email) {
      logger.warn('User or email not found for userId:', userId);
      return;
    }

    await sendEmail({
      email: user.email,
      subject: `New Incident Detected in ${monitor?.title || 'your'} monitor`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Incident Alert</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#ef4444; color:#ffffff; padding:20px; text-align:center;">
              <h2 style="margin:0;">🚨 Incident Detected</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px; color:#333;">
              <p style="font-size:16px;">Hello <strong>${user.username || 'User'}</strong>,</p>

              <p style="font-size:15px;">
                An issue has been detected with your monitored service:
              </p>

              <table width="100%" cellpadding="10" cellspacing="0" style="margin:15px 0; border:1px solid #eee; border-radius:6px;">
                <tr>
                  <td style="font-weight:bold;">📍Title:</td>
                  <td>${monitor?.title || 'Untitled monitor'}</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">🌐 Monitor ID:</td>
                  <td>${monitorId}</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">⚠️ Reason:</td>
                  <td>${reason}</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">🕒 Time:</td>
                  <td>${new Date().toLocaleString()}</td>
                </tr>
              </table>

              <!-- AI Summary -->
              <div style="background:#f9fafb; border-left:4px solid #6366f1; padding:15px; border-radius:6px;">
                <p style="margin:0; font-weight:bold;">🤖 AI Analysis</p>
                <p style="margin-top:8px; font-size:14px; color:#555;">
                  ${aiSummary}
                </p>
              </div>

              <p style="margin-top:20px; font-size:14px; color:#666;">
                Please check your system as soon as possible to minimize downtime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#888;">
              WatchTower Monitoring System<br/>
              This is an automated alert. Please do not reply.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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

  // Close the SAME open incident instead of creating a duplicate RESOLVED doc,
  // otherwise the ONGOING record lingers forever and recovery fires repeatedly.
  ongoingIncident.status = 'RESOLVED';
  ongoingIncident.endTime = new Date();
  ongoingIncident.duration = Math.floor(
    (ongoingIncident.endTime - ongoingIncident.startTime) / 1000
  );
  const resolvedIncident = await ongoingIncident.save();

  // Send email notification to the user associated with the monitor
  try {
    // populate only what you need
    await resolvedIncident.populate({
      path: 'monitorId',
      select: 'userId',
    });

    const userId = resolvedIncident?.monitorId?.userId;
    const monitor = await monitorModel.findById(monitorId);

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
      subject: 'Issue Resolved: Monitor Back Online',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Issue Resolved of ${monitor?.title || 'your'} monitor</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#22c55e; color:#ffffff; padding:20px; text-align:center;">
              <h2 style="margin:0;">✅ Issue Resolved</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px; color:#333;">
              <p style="font-size:16px;">Hello <strong>${user.username || 'User'}</strong>,</p>

              <p style="font-size:15px;">
                Good news! 🎉 Your monitored service is now back online.
              </p>

              <table width="100%" cellpadding="10" cellspacing="0" style="margin:15px 0; border:1px solid #eee; border-radius:6px;">
                <tr>
                  <td style="font-weight:bold;">📍Title:</td>
                  <td>${monitor?.title || 'Untitled monitor'}</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">🌐 Monitor ID:</td>
                  <td>${monitorId}</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">🕒 Downtime Duration:</td>
                  <td>${resolvedIncident.duration} seconds</td>
                </tr>
                <tr>
                  <td style="font-weight:bold;">⏱️ Resolved At:</td>
                  <td>${resolvedIncident.endTime.toLocaleString()}</td>
                </tr>
              </table>

              <div style="margin-top:15px; padding:15px; background:#ecfdf5; border-left:4px solid #22c55e; border-radius:6px;">
                <p style="margin:0; font-weight:bold;">Status</p>
                <p style="margin-top:8px; font-size:14px; color:#065f46;">
                  Your service is now operating normally.
                </p>
              </div>

              <p style="margin-top:20px; font-size:14px; color:#666;">
                No further action is required. We will continue monitoring your service.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#888;">
              WatchTower Monitoring System<br/>
              This is an automated notification. Please do not reply.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    logger.info(`Resolved email sent successfully to user: ${user.email}`);
  } catch (error) {
    logger.error('Error sending incident email:', error);
  }

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
