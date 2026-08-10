const cron = require('node-cron');
const { checkService } = require('../services/health.service');
const { processHealthCheckResult } = require('../services/downtime.service');
const { logger } = require('../config/logger');

let cronJob = null;
let isRunning = false;

/**
 * Parse monitor services from environment variable
 * @returns {string[]} Array of service URLs
 */
function parseMonitorServices() {
  const servicesEnv = process.env.MONITOR_SERVICES;
  
  if (!servicesEnv) {
    // Default to checking local health endpoint
    const port = process.env.PORT || 5001;
    return [`http://localhost:${port}/api/health`];
  }
  
  return servicesEnv.split(',').map(s => s.trim()).filter(s => s);
}

/**
 * Run health check for all monitored services
 */
async function runHealthCheck() {
  if (isRunning) {
    logger.warn('Health check already running, skipping this cycle');
    return;
  }
  
  isRunning = true;
  const startTime = Date.now();
  
  try {
    const services = parseMonitorServices();
    const timeoutMs = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5000;
    const thresholdMs = parseInt(process.env.DOWN_ALERT_THRESHOLD_MS) || 300000; // 5 minutes default
    
    logger.info(`Running health checks for ${services.length} service(s)...`);
    
    // Check all services in parallel
    const checks = services.map(async (serviceUrl) => {
      try {
        const result = await checkService(serviceUrl, timeoutMs);
        await processHealthCheckResult(serviceUrl, result, thresholdMs);
        return { serviceUrl, success: result.ok };
      } catch (error) {
        logger.error(`Error checking service ${serviceUrl}:`, error);
        // Treat as unhealthy check
        await processHealthCheckResult(serviceUrl, { ok: false, error: error.message }, thresholdMs);
        return { serviceUrl, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(checks);
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    logger.info(`Health check completed in ${duration}ms: ${successCount} OK, ${failCount} Failed`);
    
    return results;
    
  } catch (error) {
    logger.error('Error in health check cycle:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the downtime monitor with scheduled health checks
 */
function start() {
  if (cronJob) {
    logger.warn('Downtime monitor already started');
    return;
  }
  
  const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL_MINUTES) || 10;
  const cronExpression = `*/${intervalMinutes} * * * *`; // Every N minutes
  
  logger.info(`Starting downtime monitor with ${intervalMinutes}-minute intervals`);
  logger.info(`Monitoring services: ${parseMonitorServices().join(', ')}`);
  
  // Schedule the cron job
  cronJob = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled health check triggered');
    await runHealthCheck();
  });
  
  // Run initial check immediately on startup
  logger.info('Running initial health check...');
  setImmediate(() => {
    runHealthCheck().catch(err => {
      logger.error('Error in initial health check:', err);
    });
  });
  
  logger.info('✅ Downtime monitor started successfully');
}

/**
 * Stop the downtime monitor
 */
function stop() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Downtime monitor stopped');
  }
}

/**
 * Check if monitor is running
 * @returns {boolean}
 */
function isMonitorRunning() {
  return cronJob !== null;
}

/**
 * Get monitor configuration
 * @returns {object}
 */
function getConfig() {
  return {
    intervalMinutes: parseInt(process.env.MONITOR_INTERVAL_MINUTES) || 10,
    thresholdMs: parseInt(process.env.DOWN_ALERT_THRESHOLD_MS) || 300000,
    timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS) || 5000,
    services: parseMonitorServices(),
    alertEmails: process.env.ALERT_EMAILS || 'Not configured',
    isRunning: isMonitorRunning()
  };
}

module.exports = {
  start,
  stop,
  runHealthCheck,
  isMonitorRunning,
  getConfig,
  parseMonitorServices
};
