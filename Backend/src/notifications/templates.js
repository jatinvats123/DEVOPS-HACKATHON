/**
 * Incident email templates.
 *
 * Extracted verbatim-in-spirit from incident.service.js, where 140 lines of
 * inline HTML sat in the middle of the incident state machine.
 *
 * Every interpolated value is HTML-escaped. The originals injected monitor
 * titles, URLs and AI-generated summaries straight into markup — all of which
 * are attacker-influenced (a monitor title is free text the user controls, and
 * the AI summary derives from a remote server's error string).
 */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const shell = (accent, heading, body) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>${escapeHtml(heading)}</title></head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:${accent}; color:#ffffff; padding:20px; text-align:center;">
            <h2 style="margin:0;">${escapeHtml(heading)}</h2>
          </td>
        </tr>
        <tr><td style="padding:20px; color:#333;">${body}</td></tr>
        <tr>
          <td style="background:#f4f6f8; padding:15px; text-align:center; font-size:12px; color:#888;">
            WatchTower Monitoring System<br/>
            This is an automated alert. Please do not reply.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const row = (label, value) => `
  <tr>
    <td style="font-weight:bold;">${label}</td>
    <td>${escapeHtml(value)}</td>
  </tr>`;

export function incidentOpenedEmail({ user, monitor, incident, occurredAt }) {
  const body = `
    <p style="font-size:16px;">Hello <strong>${escapeHtml(user?.username || 'User')}</strong>,</p>
    <p style="font-size:15px;">An issue has been detected with your monitored service:</p>
    <table width="100%" cellpadding="10" cellspacing="0" style="margin:15px 0; border:1px solid #eee; border-radius:6px;">
      ${row('📍 Title:', monitor?.title || 'Untitled monitor')}
      ${row('🌐 URL:', monitor?.url)}
      ${row('⚠️ Reason:', incident?.reason || 'Monitor is down')}
      ${row('🔁 Failed checks:', `${monitor?.failureThreshold ?? 3} consecutive`)}
      ${row('🕒 Time:', (occurredAt || new Date()).toLocaleString())}
    </table>
    ${
      incident?.aiSummary
        ? `<div style="background:#f9fafb; border-left:4px solid #6366f1; padding:15px; border-radius:6px;">
             <p style="margin:0; font-weight:bold;">🤖 AI Analysis</p>
             <p style="margin-top:8px; font-size:14px; color:#555;">${escapeHtml(incident.aiSummary)}</p>
           </div>`
        : ''
    }
    <p style="margin-top:20px; font-size:14px; color:#666;">
      Please check your system as soon as possible to minimize downtime.
    </p>`;

  return {
    subject: `🚨 Incident: ${monitor?.title || 'your monitor'} is DOWN`,
    html: shell('#ef4444', '🚨 Incident Detected', body),
  };
}

export function incidentClosedEmail({ user, monitor, incident, occurredAt }) {
  const seconds = incident?.duration ?? 0;
  const readable =
    seconds >= 3600
      ? `${(seconds / 3600).toFixed(1)} hours`
      : seconds >= 60
        ? `${(seconds / 60).toFixed(1)} minutes`
        : `${seconds} seconds`;

  const body = `
    <p style="font-size:16px;">Hello <strong>${escapeHtml(user?.username || 'User')}</strong>,</p>
    <p style="font-size:15px;">Good news — your monitored service is back online.</p>
    <table width="100%" cellpadding="10" cellspacing="0" style="margin:15px 0; border:1px solid #eee; border-radius:6px;">
      ${row('📍 Title:', monitor?.title || 'Untitled monitor')}
      ${row('🌐 URL:', monitor?.url)}
      ${row('🕒 Downtime:', readable)}
      ${row('⏱️ Resolved at:', (occurredAt || new Date()).toLocaleString())}
    </table>
    <div style="margin-top:15px; padding:15px; background:#ecfdf5; border-left:4px solid #22c55e; border-radius:6px;">
      <p style="margin:0; font-weight:bold;">Status</p>
      <p style="margin-top:8px; font-size:14px; color:#065f46;">Your service is now operating normally.</p>
    </div>`;

  return {
    subject: `✅ Resolved: ${monitor?.title || 'your monitor'} is back UP`,
    html: shell('#22c55e', '✅ Issue Resolved', body),
  };
}

export default { incidentOpenedEmail, incidentClosedEmail, escapeHtml };
