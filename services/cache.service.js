/**
 * Cache Service
 * Provides Redis-based caching with LRU fallback
 * Supports get, set, del, wrap operations with configurable TTL
 */

const Redis = require('ioredis');
const { LRUCache } = require('lru-cache');
const { logger } = require('../config/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.lruCache = null;
    this.isRedisAvailable = false;
    this._lastRedisWarnAt = 0;
    this.initializeCache();
  }

  /**
   * Initialize cache (Redis or LRU fallback)
   */
  initializeCache() {
    const redisUrl = process.env.REDIS_URL;
    
    // Optionally allow disabling Redis attempts via USE_REDIS=false
    const useRedis = (process.env.USE_REDIS || 'true').toLowerCase() !== 'false';
    // Try to connect to Redis if URL is provided and enabled
    if (redisUrl && useRedis) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
          }
        });

        this.redis.on('connect', () => {
          this.isRedisAvailable = true;
          logger.info('✅ Redis cache connected successfully');
          // reset warn timestamp on successful connect
          this._lastRedisWarnAt = 0;
        });

        this.redis.on('error', (err) => {
          this.isRedisAvailable = false;
          // throttle frequent warnings to avoid log spam
          try {
            const now = Date.now();
            const thresh = parseInt(process.env.REDIS_WARN_THROTTLE_MS) || 30000; // 30s
            if (now - this._lastRedisWarnAt > thresh) {
              logger.warn(`⚠️  Redis connection error: ${err && err.message ? err.message : err}. Falling back to LRU cache.`);
              this._lastRedisWarnAt = now;
            }
          } catch (e) { logger.warn('Redis error (unable to throttle):', e); }
          this.initializeLRUCache();
        });

        this.redis.on('close', () => {
          this.isRedisAvailable = false;
          const now = Date.now();
          const thresh = parseInt(process.env.REDIS_WARN_THROTTLE_MS) || 30000;
          if (now - this._lastRedisWarnAt > thresh) {
            logger.warn('⚠️  Redis connection closed. Using LRU cache fallback.');
            this._lastRedisWarnAt = now;
          }
        });

      } catch (error) {
        logger.error(`Failed to initialize Redis: ${error.message}`);
        this.initializeLRUCache();
      }
    } else {
      logger.info('ℹ️  No REDIS_URL configured or Redis disabled. Using in-memory LRU cache.');
      this.initializeLRUCache();
    }
  }

  /**
   * Initialize LRU cache as fallback
   */
  initializeLRUCache() {
    if (!this.lruCache) {
      this.lruCache = new LRUCache({
        max: 500, // Maximum number of items
        maxSize: 50 * 1024 * 1024, // 50MB max size
        sizeCalculation: (value) => {
          return JSON.stringify(value).length;
        },
        ttl: 1000 * 60 * 5, // Default 5 minutes TTL
        allowStale: false,
        updateAgeOnGet: false,
        updateAgeOnHas: false
      });
      logger.info('✅ LRU cache initialized');
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          logger.debug(`Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
      } else {
        const value = this.lruCache.get(key);
        if (value !== undefined) {
          logger.debug(`Cache HIT (LRU): ${key}`);
          return value;
        }
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default from env or 300s)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    try {
      const ttlSeconds = ttl || parseInt(process.env.CACHE_DEFAULT_TTL) || 300;

      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        logger.debug(`Cache SET (Redis): ${key} [TTL: ${ttlSeconds}s]`);
      } else {
        this.lruCache.set(key, value, { ttl: ttlSeconds * 1000 });
        logger.debug(`Cache SET (LRU): ${key} [TTL: ${ttlSeconds}s]`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key or pattern
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        // Support for wildcard deletion
        if (key.includes('*')) {
          const keys = await this.redis.keys(key);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            logger.debug(`Cache DEL (Redis): ${keys.length} keys matching ${key}`);
          }
        } else {
          await this.redis.del(key);
          logger.debug(`Cache DEL (Redis): ${key}`);
        }
      } else {
        if (key.includes('*')) {
          // Pattern matching for LRU cache
          const pattern = new RegExp('^' + key.replace(/\*/g, '.*') + '$');
          const keysToDelete = [];
          for (const k of this.lruCache.keys()) {
            if (pattern.test(k)) {
              keysToDelete.push(k);
            }
          }
          keysToDelete.forEach(k => this.lruCache.delete(k));
          logger.debug(`Cache DEL (LRU): ${keysToDelete.length} keys matching ${key}`);
        } else {
          this.lruCache.delete(key);
          logger.debug(`Cache DEL (LRU): ${key}`);
        }
      }
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Wrap a function with caching
   * Executes function and caches result if not already cached
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @param {Function} fn - Async function to execute if cache miss
   * @returns {Promise<any>} - Cached or fresh value
   */
  async wrap(key, ttl, fn) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function
      const result = await fn();

      // Cache the result
      await this.set(key, result, ttl);

      return result;
    } catch (error) {
      logger.error(`Cache WRAP error for key ${key}: ${error.message}`);
      // On error, still try to execute the function
      return await fn();
    }
  }

  /**
   * Clear all cache entries
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb();
        logger.info('Cache CLEAR (Redis): All entries cleared');
      } else {
        this.lruCache.clear();
        logger.info('Cache CLEAR (LRU): All entries cleared');
      }
      return true;
    } catch (error) {
      logger.error(`Cache CLEAR error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    if (this.isRedisAvailable && this.redis) {
      return {
        type: 'redis',
        connected: this.isRedisAvailable,
        status: this.redis.status
      };
    } else {
      return {
        type: 'lru',
        size: this.lruCache.size,
        maxSize: this.lruCache.max,
        calculatedSize: this.lruCache.calculatedSize
      };
    }
  }

  /**
   * Close cache connections
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
