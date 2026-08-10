const { sendEmail } = require('../config/mailer');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * Send email alert for downtime incident
 * @param {string} serviceUrl - The service that is down
 * @param {object} incident - Downtime incident from DB
 * @param {number} downtimeMs - Duration of downtime in milliseconds
 */
async function sendEmailAlert(serviceUrl, incident, downtimeMs) {
  try {
    const alertEmails = process.env.ALERT_EMAILS;
    if (!alertEmails) {
      logger.warn('ALERT_EMAILS not configured. Skipping email alert.');
      return;
    }
    
    const emailList = alertEmails.split(',').map(e => e.trim());
    const subject = `🚨 Service Downtime Alert - ${serviceUrl}`;
    
    // Load HTML template
    const templatePath = path.join(__dirname, '../templates/downtimeAlert.html');
    let html;
    
    try {
      html = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      html = html
        .replace(/{{serviceName}}/g, serviceUrl)
        .replace(/{{startTime}}/g, incident.startAt.toISOString())
        .replace(/{{duration}}/g, formatDuration(downtimeMs))
        .replace(/{{details}}/g, incident.details || 'Service unreachable')
        .replace(/{{incidentId}}/g, incident._id.toString())
        .replace(/{{logsUrl}}/g, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/downtimes`);
        
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      logger.warn('Downtime alert template not found, using fallback HTML');
      html = generateFallbackHtml(serviceUrl, incident, downtimeMs);
    }
    
    // Send to all configured admin emails
    for (const email of emailList) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
          text: `Service ${serviceUrl} is down. Started at: ${incident.startAt.toISOString()}. Duration: ${formatDuration(downtimeMs)}. Details: ${incident.details}`
        });
        
        logger.info(`Downtime alert sent to ${email} for ${serviceUrl}`);
      } catch (emailErr) {
        logger.error(`Failed to send alert to ${email}:`, emailErr);
      }
    }
    
    // Send webhook if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      await sendWebhookAlert({
        event: 'service_down',
        service: serviceUrl,
        startTime: incident.startAt,
        duration: downtimeMs,
        details: incident.details,
        incidentId: incident._id
      });
    }
    
  } catch (error) {
    logger.error('Error sending downtime alert:', error);
    throw error;
  }
}

/**
 * Send recovery notification email
 * @param {string} serviceUrl - The service that recovered
 * @param {object} incident - Downtime incident from DB
 */
async function sendRecoveryEmail(serviceUrl, incident) {
  try {
    const alertEmails = process.env.ALERT_EMAILS;
    if (!alertEmails) return;
    
    const emailList = alertEmails.split(',').map(e => e.trim());
    const subject = `✅ Service Recovered - ${serviceUrl}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">✅ Service Recovered</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Service Details</h2>
          <p><strong>Service:</strong> ${serviceUrl}</p>
          <p><strong>Downtime Started:</strong> ${incident.startAt.toISOString()}</p>
          <p><strong>Recovered At:</strong> ${incident.endAt.toISOString()}</p>
          <p><strong>Total Downtime:</strong> ${formatDuration(incident.durationMs)}</p>
          <p><strong>Incident ID:</strong> ${incident._id}</p>
        </div>
        
        <div style="padding: 20px; text-align: center; background-color: #fff;">
          <p style="color: #666;">The service is now operational and responding to health checks.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/downtimes" 
             style="display: inline-block; padding: 12px 24px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            View Incident Details
          </a>
        </div>
        
        <div style="padding: 10px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
          <p>InsureMithra Monitoring System</p>
        </div>
      </div>
    `;
    
    for (const email of emailList) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
          text: `Service ${serviceUrl} has recovered. Downtime duration: ${formatDuration(incident.durationMs)}`
        });
        
        logger.info(`Recovery notification sent to ${email} for ${serviceUrl}`);
      } catch (emailErr) {
        logger.error(`Failed to send recovery email to ${email}:`, emailErr);
      }
    }
    
    // Send webhook if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      await sendWebhookAlert({
        event: 'service_recovered',
        service: serviceUrl,
        startTime: incident.startAt,
        endTime: incident.endAt,
        duration: incident.durationMs,
        incidentId: incident._id
      });
    }
    
  } catch (error) {
    logger.error('Error sending recovery email:', error);
  }
}

/**
 * Send webhook alert to external service (Slack, PagerDuty, etc.)
 * @param {object} payload - Alert payload
 */
async function sendWebhookAlert(payload) {
  try {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logger.info('Webhook alert sent successfully');
  } catch (error) {
    logger.error('Failed to send webhook alert:', error);
  }
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms 
 * @returns {string}
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate fallback HTML when template is not found
 */
function generateFallbackHtml(serviceUrl, incident, downtimeMs) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">🚨 Service Downtime Alert</h1>
      </div>
      
      <div style="padding: 20px; background-color: #fff3cd;">
        <h2 style="color: #856404;">Critical: Service is Down</h2>
        <p><strong>Service:</strong> ${serviceUrl}</p>
        <p><strong>Started At:</strong> ${incident.startAt.toISOString()}</p>
        <p><strong>Duration:</strong> ${formatDuration(downtimeMs)}</p>
        <p><strong>Details:</strong> ${incident.details || 'Service unreachable'}</p>
        <p><strong>Incident ID:</strong> ${incident._id}</p>
      </div>
      
      <div style="padding: 20px; text-align: center; background-color: #f9f9f9;">
        <p style="color: #666;">Please investigate and resolve the issue immediately.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/downtimes" 
           style="display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          View Downtime Logs
        </a>
      </div>
      
      <div style="padding: 10px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd;">
        <p>InsureMithra Monitoring System</p>
      </div>
    </div>
  `;
}

module.exports = {
  sendEmailAlert,
  sendRecoveryEmail,
  sendWebhookAlert,
  formatDuration
};
