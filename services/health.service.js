const axios = require('axios');
const { logger } = require('../config/logger');

/**
 * Check health of a service by making an HTTP request
 * @param {string} url - The health endpoint URL to check
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Promise<{ok: boolean, statusCode?: number, latencyMs: number, error?: string}>}
 */
async function checkService(url, timeoutMs = 5000) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true, // Accept all status codes
      headers: {
        'User-Agent': 'InsureMithra-Monitor/1.0'
      },
      maxRedirects: 0 // Don't follow redirects
    });
    
    const latencyMs = Date.now() - startTime;
    const ok = response.status >= 200 && response.status < 300;
    
    logger.info(`Health check for ${url}: status=${response.status}, latency=${latencyMs}ms, ok=${ok}`);
    
    return {
      ok,
      statusCode: response.status,
      latencyMs,
      responseData: response.data
    };
    
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    let errorMessage = error.message;
    let statusCode;
    
    // If axios received a response but threw an error (e.g., network issue after response)
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `HTTP ${statusCode}: ${error.message}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - service not reachable';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = `Request timeout after ${timeoutMs}ms`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS lookup failed - host not found';
    }
    
    logger.error(`Health check failed for ${url}: ${errorMessage}`, {
      code: error.code,
      latency: latencyMs,
      statusCode
    });
    
    return {
      ok: false,
      statusCode,
      latencyMs,
      error: errorMessage,
      errorCode: error.code
    };
  }
}

/**
 * Check multiple services in parallel
 * @param {string[]} urls - Array of service URLs to check
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Promise<Array<{url: string, result: object}>>}
 */
async function checkMultipleServices(urls, timeoutMs = 5000) {
  const checks = urls.map(async (url) => {
    const result = await checkService(url, timeoutMs);
    return { url, result };
  });
  
  return Promise.all(checks);
}

/**
 * Parse and validate service URL
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, url?: string, error?: string}}
 */
function validateServiceUrl(url) {
  try {
    // eslint-disable-next-line no-undef
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }
      return { valid: true, url: parsed.href };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

module.exports = {
  checkService,
  checkMultipleServices,
  validateServiceUrl
};
