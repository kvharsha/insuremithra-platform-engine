const Redis = require('ioredis');
const { logger } = require('../config/logger');

// Simple in-memory blacklist with optional Redis backing
class TokenBlacklist {
  constructor() {
    this.store = new Map(); // token -> expireAt(ms)
    this.redis = null;

    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy(times) { return Math.min(times * 50, 2000); }
        });

        this.redis.on('connect', () => {
          logger.info('✅ TokenBlacklist Redis connected');
        });

        // handle errors to avoid unhandled error events
        this.redis.on('error', (err) => {
          logger.warn(`⚠️ TokenBlacklist Redis error: ${err && err.message ? err.message : err}`);
          // fallback to in-memory store on errors
          try { 
            this.redis.disconnect(); 
          } catch (_e) {
            // ignore disconnect errors
          }
          this.redis = null;
        });

        this.redis.on('close', () => {
          logger.warn('⚠️ TokenBlacklist Redis connection closed; using in-memory fallback');
          this.redis = null;
        });
      } catch (e) {
        logger.warn('Failed to initialize TokenBlacklist Redis client, using in-memory fallback', e && e.message ? e.message : e);
        this.redis = null;
      }
    }
  }

  async add(token, ttlSeconds = 3600) {
    if (this.redis) {
      await this.redis.setex(`blacklist:${token}`, ttlSeconds, '1');
      return true;
    }

    const expireAt = Date.now() + ttlSeconds * 1000;
    this.store.set(token, expireAt);
    // schedule cleanup
    setTimeout(() => {
      this.store.delete(token);
    }, ttlSeconds * 1000 + 1000);
    return true;
  }

  async has(token) {
    if (!token) return false;
    if (this.redis) {
      const v = await this.redis.get(`blacklist:${token}`);
      return !!v;
    }

    const expireAt = this.store.get(token);
    if (!expireAt) return false;
    if (Date.now() > expireAt) {
      this.store.delete(token);
      return false;
    }
    return true;
  }

  // helper for tests
  clearAll() {
    this.store.clear();
    if (this.redis) return this.redis.flushdb();
    return Promise.resolve();
  }
}

module.exports = new TokenBlacklist();
