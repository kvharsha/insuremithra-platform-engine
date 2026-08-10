const Downtime = require('../models/downtime.model');
const { sendEmailAlert, sendRecoveryEmail } = require('./alert.service');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

// In-memory state for each monitored service
const serviceState = new Map();

/**
 * Initialize or get service state
 * @param {string} serviceUrl 
 * @returns {object} Service state object
 */
function getServiceState(serviceUrl) {
  if (!serviceState.has(serviceUrl)) {
    serviceState.set(serviceUrl, {
      lastSuccessAt: new Date(),
      consecutiveFailures: 0,
      currentIncident: null, // { startAt, incidentId }
      lastCheckAt: null,
      isDown: false
    });
  }
  return serviceState.get(serviceUrl);
}

/**
 * Log downtime event to downtime.log file
 * @param {object} eventData 
 */
async function logDowntimeEvent(eventData) {
  try {
    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'downtime.log');
    
    // Ensure logs directory exists
    await fs.mkdir(logsDir, { recursive: true });
    
    // Append log entry as JSON line
    const logEntry = JSON.stringify({
      ...eventData,
      timestamp: new Date().toISOString()
    }) + '\n';
    
    await fs.appendFile(logFile, logEntry);
  } catch (error) {
    logger.error('Error writing to downtime.log:', error);
  }
}

/**
 * Process health check result and detect downtime
 * @param {string} serviceUrl - The service URL that was checked
 * @param {object} checkResult - Result from health.service.checkService()
 * @param {number} thresholdMs - Downtime threshold in milliseconds
 */
async function processHealthCheckResult(serviceUrl, checkResult, thresholdMs = 300000) {
  const state = getServiceState(serviceUrl);
  const now = new Date();
  state.lastCheckAt = now;
  
  if (checkResult.ok) {
    // Service is healthy
    await handleServiceHealthy(serviceUrl, state, now);
  } else {
    // Service is unhealthy
    await handleServiceUnhealthy(serviceUrl, state, checkResult, now, thresholdMs);
  }
}

/**
 * Handle healthy service check
 */
async function handleServiceHealthy(serviceUrl, state, now) {
  state.lastSuccessAt = now;
  
  // If there was an ongoing incident, close it
  if (state.currentIncident && state.isDown) {
    logger.info(`Service recovered: ${serviceUrl}`);
    
    try {
      // Find and close the incident in DB
      const incident = await Downtime.findById(state.currentIncident.incidentId);
      if (incident && !incident.endAt) {
        await incident.closeIncident(now);
        
        // Log recovery
        await logDowntimeEvent({
          event: 'SERVICE_RECOVERED',
          service: serviceUrl,
          startAt: incident.startAt,
          endAt: now,
          durationMs: incident.durationMs
        });
        
        // Send recovery email
        await sendRecoveryEmail(serviceUrl, incident);
      }
    } catch (error) {
      logger.error(`Error closing incident for ${serviceUrl}:`, error);
    }
    
    // Reset state
    state.currentIncident = null;
    state.isDown = false;
  }
  
  // Reset consecutive failures
  state.consecutiveFailures = 0;
}

/**
 * Handle unhealthy service check
 */
async function handleServiceUnhealthy(serviceUrl, state, checkResult, now, thresholdMs) {
  state.consecutiveFailures++;
  
  logger.warn(`Service check failed for ${serviceUrl}: ${checkResult.error} (consecutive failures: ${state.consecutiveFailures})`);
  
  // Calculate time since last success
  const timeSinceSuccess = now - state.lastSuccessAt;
  
  // Check if we should trigger a downtime alert
  if (timeSinceSuccess >= thresholdMs && !state.isDown) {
    logger.error(`Service downtime detected: ${serviceUrl} (down for ${Math.floor(timeSinceSuccess / 1000)}s)`);
    
    // Create downtime incident
    const incident = new Downtime({
      service: serviceUrl,
      startAt: state.lastSuccessAt, // Use last success as start time
      status: 'down',
      details: checkResult.error || 'Service unreachable',
      alertSent: false
    });
    
    await incident.save();
    
    // Update state
    state.currentIncident = {
      startAt: state.lastSuccessAt,
      incidentId: incident._id
    };
    state.isDown = true;
    
    // Log incident
    await logDowntimeEvent({
      event: 'DOWNTIME_DETECTED',
      service: serviceUrl,
      startAt: state.lastSuccessAt,
      details: checkResult.error,
      consecutiveFailures: state.consecutiveFailures,
      timeSinceSuccessMs: timeSinceSuccess
    });
    
    // Send alert email
    try {
      await sendEmailAlert(serviceUrl, incident, timeSinceSuccess);
      incident.alertSent = true;
      await incident.save();
    } catch (error) {
      logger.error(`Failed to send alert email for ${serviceUrl}:`, error);
    }
  } else if (state.isDown) {
    // Update ongoing incident
    await logDowntimeEvent({
      event: 'DOWNTIME_ONGOING',
      service: serviceUrl,
      consecutiveFailures: state.consecutiveFailures,
      timeSinceSuccessMs: timeSinceSuccess
    });
  }
}

/**
 * Get current state for all monitored services
 * @returns {Array} Array of service states
 */
function getAllServiceStates() {
  const states = [];
  for (const [url, state] of serviceState.entries()) {
    states.push({
      url,
      lastSuccessAt: state.lastSuccessAt,
      lastCheckAt: state.lastCheckAt,
      consecutiveFailures: state.consecutiveFailures,
      isDown: state.isDown,
      currentIncident: state.currentIncident
    });
  }
  return states;
}

/**
 * Reset state for a specific service (useful for testing)
 * @param {string} serviceUrl 
 */
function resetServiceState(serviceUrl) {
  serviceState.delete(serviceUrl);
  logger.info(`Reset state for service: ${serviceUrl}`);
}

/**
 * Clear all service states (useful for testing)
 */
function clearAllStates() {
  serviceState.clear();
  logger.info('Cleared all service states');
}

module.exports = {
  processHealthCheckResult,
  getServiceState,
  getAllServiceStates,
  resetServiceState,
  clearAllStates,
  logDowntimeEvent
};
