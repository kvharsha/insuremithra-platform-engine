/**
 * Performance Latency Tests
 * Tests to verify API response times meet performance targets
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Policy = require('../models/policy.model');
const User = require('../models/user.model');

let mongoServer;

// Performance targets from Epic 4 Story 1
const PERFORMANCE_TARGET_MS = 2000; // Main flows should respond within 2 seconds
const FAST_RESPONSE_MS = 500; // Cached responses should be under 500ms

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create test user
  await User.create({
    email: 'test@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuvwxyz', // pre-hashed
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    role: 'user'
  });

  // Seed test policies
  const policies = [];
  const types = ['Health', 'Life', '2W', '4W', 'Travel'];
  const insurers = ['Provider A Insurance', 'Provider B Insurance'];
  const models = ['Standard Plan', 'Premium Plan', 'Deluxe Plan'];
  
  for (let i = 0; i < 50; i++) {
    policies.push({
      name: `Test Policy ${i + 1}`,
      type: types[i % types.length],
      model: models[i % models.length],
      insurer: insurers[i % insurers.length],
      premium: 10000 + (i * 1000),
      coverage: `Up to ${5 + i} Lakhs`,
      tenure: '1 year',
      description: `Test policy description ${i + 1}`,
      features: [`Feature ${i + 1}`, 'Standard Coverage', 'No Claim Bonus']
    });
  }
  await Policy.insertMany(policies);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Response Time Performance', () => {
  describe('Policy Search Endpoint', () => {
    it('should respond within 2 seconds (uncached)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/policies/search')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    }, 5000); // Extend Jest timeout to 5s for this test

    it('should respond under 500ms when cached', async () => {
      // Prime the cache
      await request(app)
        .get('/api/policies/search?type=health')
        .expect(200);

      // Measure cached response
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/policies/search?type=health')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.headers['x-cache']).toBe('HIT');
      expect(duration).toBeLessThan(FAST_RESPONSE_MS);
    });

    it('should handle filtered search within target time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/policies/search')
        .query({
          type: 'health',
          premium_max: 50000,
          coverageAmount_min: 500000
        })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    });
  });

  describe('Policy Details Endpoint', () => {
    it('should respond within 2 seconds', async () => {
      const policies = await Policy.find().limit(1);
      const policyId = policies[0]._id.toString();

      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/policies/${policyId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    });

    it('should respond faster when cached', async () => {
      const policies = await Policy.find().limit(1);
      const policyId = policies[0]._id.toString();

      // Prime cache
      await request(app).get(`/api/policies/${policyId}`);

      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/policies/${policyId}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.headers['x-cache']).toBe('HIT');
      expect(duration).toBeLessThan(FAST_RESPONSE_MS);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond very quickly (< 100ms)', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/health')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Performance Metrics Endpoint', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/health/perf')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('cache');
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Bulk Request Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now();

      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/policies/search')
          .expect(200)
      );

      await Promise.all(requests);

      const duration = Date.now() - startTime;

      // All 10 requests should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    }, 10000);
  });
});

describe('Response Time Headers', () => {
  it('should include X-Response-Time header', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.headers).toHaveProperty('x-response-time');
    expect(response.headers['x-response-time']).toMatch(/\d+(\.\d+)?ms/);
  });

  it('should include X-Cache header for cached endpoints', async () => {
    const response = await request(app)
      .get('/api/policies/search')
      .expect(200);

    expect(response.headers).toHaveProperty('x-cache');
    expect(['HIT', 'MISS']).toContain(response.headers['x-cache']);
  });
});

describe('Compression Performance', () => {
  it('should compress large responses', async () => {
    const response = await request(app)
      .get('/api/policies/search')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    // Check if Vary header is set for compression
    expect(response.headers['vary']).toContain('Accept-Encoding');
  });
});

describe('Performance Regression Tests', () => {
  it('should maintain consistent performance across multiple runs', async () => {
    const durations = [];

    // Run the same request 5 times
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await request(app)
        .get('/api/policies/search?type=life')
        .expect(200);
      durations.push(Date.now() - startTime);
    }

    // Calculate average and max
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);

    // First request might be slower (cache MISS), but average should be good
    expect(avg).toBeLessThan(PERFORMANCE_TARGET_MS);
    expect(max).toBeLessThan(PERFORMANCE_TARGET_MS * 1.5); // Allow 50% variance
  }, 15000);
});

describe('Cache Performance Impact', () => {
  it('should show performance improvement with caching', async () => {
    const cache = require('../services/cache.service');
    
    // Clear cache
    await cache.clear();

    // Measure uncached
    const startUncached = Date.now();
    await request(app)
      .get('/api/policies/search?provider=Provider A')
      .expect(200);
    const uncachedDuration = Date.now() - startUncached;

    // Measure cached
    const startCached = Date.now();
    await request(app)
      .get('/api/policies/search?provider=Provider A')
      .expect(200);
    const cachedDuration = Date.now() - startCached;

    // Cached should not be slower than uncached (environment-safe)
    expect(cachedDuration).toBeLessThanOrEqual(uncachedDuration);
  });
});
