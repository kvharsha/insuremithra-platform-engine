/**
 * Timing Middleware
 * Logs response times for performance monitoring
 * Provides performance metrics endpoint
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

// In-memory store for recent request timings
const recentTimings = [];
const MAX_TIMINGS = 1000; // Keep last 1000 requests in memory

/**
 * Timing middleware
 * Logs response time for each request
 */
const timingMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture timing
  res.end = function(...args) {
    // Calculate response time
    const hrDiff = process.hrtime(startHrTime);
    const responseTimeMs = (hrDiff[0] * 1000 + hrDiff[1] / 1000000).toFixed(2);

    // Log to performance log
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: parseFloat(responseTimeMs),
      contentLength: res.getHeader('content-length') || 0,
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip || req.connection.remoteAddress
    };

    // Add to in-memory store
    recentTimings.push(logEntry);
    if (recentTimings.length > MAX_TIMINGS) {
      recentTimings.shift(); // Remove oldest entry
    }

    // Log to file (async, don't wait)
    logPerformanceEntry(logEntry);

    // Add response time header
    res.setHeader('X-Response-Time', `${responseTimeMs}ms`);

    // Log slow requests
    if (responseTimeMs > 2000) {
      logger.warn(`Slow request: ${req.method} ${req.originalUrl} - ${responseTimeMs}ms`);
    }

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * Log performance entry to file
 * @param {object} entry - Performance log entry
 */
const logPerformanceEntry = (entry) => {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    const perfLogPath = path.join(logsDir, 'perf.log');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Append to log file
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(perfLogPath, logLine, 'utf8');
  } catch (error) {
    logger.error(`Failed to write to perf.log: ${error.message}`);
  }
};

/**
 * Calculate percentile from array of values
 * @param {number[]} values - Array of numeric values
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} - Percentile value
 */
const calculatePercentile = (values, percentile) => {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

/**
 * Get performance statistics
 * @param {number} minutes - Time window in minutes (default: 5)
 * @returns {object} - Performance statistics
 */
const getPerformanceStats = (minutes = 5) => {
  const cutoffTime = Date.now() - (minutes * 60 * 1000);
  
  // Filter recent timings within time window
  const recentRequests = recentTimings.filter(entry => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime >= cutoffTime;
  });

  if (recentRequests.length === 0) {
    return {
      timeWindow: `${minutes} minutes`,
      totalRequests: 0,
      message: 'No requests in time window'
    };
  }

  // Extract response times
  const responseTimes = recentRequests.map(r => r.responseTime);

  // Calculate statistics
  const stats = {
    timeWindow: `${minutes} minutes`,
    totalRequests: recentRequests.length,
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
    minResponseTime: Math.min(...responseTimes).toFixed(2),
    maxResponseTime: Math.max(...responseTimes).toFixed(2),
    p50: calculatePercentile(responseTimes, 50).toFixed(2),
    p95: calculatePercentile(responseTimes, 95).toFixed(2),
    p99: calculatePercentile(responseTimes, 99).toFixed(2),
    slowRequests: recentRequests.filter(r => r.responseTime > 2000).length,
    requestsByMethod: {},
    requestsByStatus: {}
  };

  // Group by method
  recentRequests.forEach(req => {
    stats.requestsByMethod[req.method] = (stats.requestsByMethod[req.method] || 0) + 1;
    
    const statusGroup = `${Math.floor(req.status / 100)}xx`;
    stats.requestsByStatus[statusGroup] = (stats.requestsByStatus[statusGroup] || 0) + 1;
  });

  return stats;
};

/**
 * Get recent slow requests
 * @param {number} threshold - Response time threshold in ms (default: 2000)
 * @param {number} limit - Max number of results (default: 10)
 * @returns {object[]} - Array of slow requests
 */
const getSlowRequests = (threshold = 2000, limit = 10) => {
  return recentTimings
    .filter(r => r.responseTime > threshold)
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, limit)
    .map(r => ({
      timestamp: r.timestamp,
      method: r.method,
      url: r.url,
      responseTime: r.responseTime,
      status: r.status
    }));
};

/**
 * Clear performance logs
 */
const clearPerformanceLogs = () => {
  try {
    const perfLogPath = path.join(__dirname, '..', 'logs', 'perf.log');
    if (fs.existsSync(perfLogPath)) {
      fs.unlinkSync(perfLogPath);
    }
    recentTimings.length = 0; // Clear in-memory array
    logger.info('Performance logs cleared');
    return true;
  } catch (error) {
    logger.error(`Failed to clear performance logs: ${error.message}`);
    return false;
  }
};

module.exports = {
  timingMiddleware,
  getPerformanceStats,
  getSlowRequests,
  clearPerformanceLogs
};
