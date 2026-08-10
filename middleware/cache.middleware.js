/**
 * Cache Middleware
 * Provides route-level caching for GET requests
 * Adds X-Cache header to indicate cache HIT or MISS
 */

const cache = require('../services/cache.service');
const { logger } = require('../config/logger');

/**
 * Generate cache key from request
 * @param {object} req - Express request object
 * @param {string} prefix - Cache key prefix
 * @returns {string} - Generated cache key
 */
const generateCacheKey = (req, prefix = 'api') => {
  const userId = req.user?.userId || 'anonymous';
  const path = req.originalUrl || req.url;
  const queryString = JSON.stringify(req.query);
  
  // Create unique key based on route, user, and query params
  return `${prefix}:${userId}:${path}:${queryString}`;
};

/**
 * Cache middleware factory
 * @param {object} options - Middleware options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.prefix - Cache key prefix
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {boolean} options.userSpecific - Whether cache should be user-specific (default: false)
 * @returns {Function} - Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = parseInt(process.env.CACHE_DEFAULT_TTL) || 300,
    prefix = 'api',
    keyGenerator = null,
    userSpecific = false
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(req);
      } else if (userSpecific && req.user) {
        cacheKey = generateCacheKey(req, prefix);
      } else {
        // Non-user-specific cache (ignore user ID)
        const path = req.originalUrl || req.url;
        const queryString = JSON.stringify(req.query);
        cacheKey = `${prefix}:${path}:${queryString}`;
      }

      // Try to get from cache
      const cachedResponse = await cache.get(cacheKey);

      if (cachedResponse) {
        // Cache HIT
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        logger.debug(`Cache HIT: ${cacheKey}`);
        
        return res.status(cachedResponse.status || 200).json(cachedResponse.data);
      }

      // Cache MISS - intercept response
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      logger.debug(`Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cacheData = {
            status: res.statusCode,
            data: data
          };

          // Cache the response asynchronously (don't wait)
          cache.set(cacheKey, cacheData, ttl)
            .catch(err => logger.error(`Failed to cache response: ${err.message}`));
        }

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error: ${error.message}`);
      // On error, continue without caching
      next();
    }
  };
};

/**
 * Preconfigured cache middleware for policy search
 * TTL: 60 seconds
 */
const cachePolicySearch = cacheMiddleware({
  ttl: parseInt(process.env.CACHE_POLICY_SEARCH_TTL) || 60,
  prefix: 'policies:search',
  userSpecific: false
});

/**
 * Preconfigured cache middleware for policy details
 * TTL: 300 seconds (5 minutes)
 */
const cachePolicyDetails = cacheMiddleware({
  ttl: parseInt(process.env.CACHE_POLICY_DETAIL_TTL) || 300,
  prefix: 'policy:detail',
  userSpecific: false
});

/**
 * Preconfigured cache middleware for user purchases
 * TTL: 30 seconds
 */
const cacheUserPurchases = cacheMiddleware({
  ttl: parseInt(process.env.CACHE_USER_PURCHASES_TTL) || 30,
  prefix: 'user:purchases',
  userSpecific: true
});

/**
 * Preconfigured cache middleware for user claims
 * TTL: 30 seconds
 */
const cacheUserClaims = cacheMiddleware({
  ttl: parseInt(process.env.CACHE_USER_CLAIMS_TTL) || 30,
  prefix: 'user:claims',
  userSpecific: true
});

/**
 * Cache invalidation helper
 * Invalidates cache keys matching pattern
 * @param {string} pattern - Cache key pattern (supports wildcards)
 * @returns {Promise<boolean>} - Success status
 */
const invalidateCache = async (pattern) => {
  try {
    await cache.del(pattern);
    logger.info(`Cache invalidated: ${pattern}`);
    return true;
  } catch (error) {
    logger.error(`Cache invalidation error: ${error.message}`);
    return false;
  }
};

/**
 * Invalidate policy-related caches
 * @param {string} policyId - Optional specific policy ID
 */
const invalidatePolicyCache = async (policyId = null) => {
  if (policyId) {
    await invalidateCache(`policy:detail:*${policyId}*`);
  }
  await invalidateCache('policies:search:*');
};

/**
 * Invalidate user-specific caches
 * @param {string} userId - User ID
 */
const invalidateUserCache = async (userId) => {
  await invalidateCache(`user:purchases:${userId}:*`);
  await invalidateCache(`user:claims:${userId}:*`);
};

/**
 * Invalidate all caches
 */
const invalidateAllCache = async () => {
  await cache.clear();
};

module.exports = {
  cacheMiddleware,
  cachePolicySearch,
  cachePolicyDetails,
  cacheUserPurchases,
  cacheUserClaims,
  invalidateCache,
  invalidatePolicyCache,
  invalidateUserCache,
  invalidateAllCache,
  generateCacheKey
};
