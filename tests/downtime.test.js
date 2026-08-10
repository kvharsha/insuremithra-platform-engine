const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Downtime = require('../models/downtime.model');
const { checkService } = require('../services/health.service');
const { processHealthCheckResult, clearAllStates, getServiceState } = require('../services/downtime.service');
const { sendEmailAlert } = require('../services/alert.service');
const downtimeMonitor = require('../scheduler/downtimeMonitor');

// Mock the alert service to prevent actual emails during tests
jest.mock('../services/alert.service');

// Unmock axios to allow real HTTP requests for health checks
jest.unmock('axios');

describe('Downtime Monitoring System', () => {
  let testServer;
  let testApp;
  const testServiceUrl = 'http://127.0.0.1:9999/test';
  let serverShouldFail = false;
  
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/insuremithra_test';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Start a test server on port 9999 for health check testing
    const express = require('express');
    testApp = express();
    
    testApp.get('/test', (req, res) => {
      if (serverShouldFail) {
        return res.status(500).json({ error: 'Service unavailable' });
      }
      res.json({ status: 'OK' });
    });
    
    // Start server and wait for it to be ready
    await new Promise((resolve) => {
      testServer = testApp.listen(9999, '127.0.0.1', () => {
        console.log('Test server started on http://127.0.0.1:9999');
        resolve();
      });
    });
    
    // Give server a moment to fully start
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  afterAll(async () => {
    if (testServer) {
      await new Promise((resolve) => testServer.close(resolve));
    }
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    // Clear downtime collection and state before each test
    await Downtime.deleteMany({});
    clearAllStates();
    sendEmailAlert.mockClear();
    serverShouldFail = false;
  });
  
  describe('Health Check Service', () => {
    test('should successfully check a healthy service', async () => {
      const result = await checkService(testServiceUrl, 5000);
      
      expect(result.ok).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
    
    test('should detect unhealthy service', async () => {
      serverShouldFail = true;
      
      const result = await checkService(testServiceUrl, 5000);
      
      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(500);
    });
    
    test('should handle connection refused', async () => {
      const result = await checkService('http://127.0.0.1:9998/nonexistent', 2000);
      
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection refused');
    }, 10000);
    
    test('should handle timeout', async () => {
      // Use a very short timeout to force timeout
      const result = await checkService(testServiceUrl, 1);
      
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('Downtime Detection Service', () => {
    test('should not trigger alert for short-term failure', async () => {
      const result = { ok: false, error: 'Service down', latencyMs: 1000 };
      
      // Process a failed check with threshold of 5 minutes (300000ms)
      await processHealthCheckResult(testServiceUrl, result, 300000);
      
      // Should not send alert immediately (only after 5 minutes)
      expect(sendEmailAlert).not.toHaveBeenCalled();
      
      // Check no incident created yet
      const incidents = await Downtime.find({ service: testServiceUrl });
      expect(incidents.length).toBe(0);
    });
    
    test('should trigger alert when downtime exceeds threshold', async () => {
      const result = { ok: false, error: 'Service down', latencyMs: 1000 };
      
      // Set last success to 10 minutes ago to simulate prolonged downtime
      const state = getServiceState(testServiceUrl);
      state.lastSuccessAt = new Date(Date.now() - 10 * 60 * 1000);
      
      // Process failed check with 5 minute threshold (will trigger immediately)
      await processHealthCheckResult(testServiceUrl, result, 5 * 60 * 1000);
      
      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should send alert
      expect(sendEmailAlert).toHaveBeenCalled();
      
      // Should create incident in DB
      const incidents = await Downtime.find({ service: testServiceUrl });
      expect(incidents.length).toBe(1);
      expect(incidents[0].status).toBe('down');
      expect(incidents[0].details).toBe('Service down');
    });
    
    test('should not send duplicate alerts for same incident', async () => {
      const result = { ok: false, error: 'Service down', latencyMs: 1000 };
      
      // Set last success to 10 minutes ago
      const state = getServiceState(testServiceUrl);
      state.lastSuccessAt = new Date(Date.now() - 10 * 60 * 1000);
      
      // First failed check (triggers alert)
      await processHealthCheckResult(testServiceUrl, result, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(sendEmailAlert).toHaveBeenCalledTimes(1);
      
      // Second failed check (should not trigger another alert)
      await processHealthCheckResult(testServiceUrl, result, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Still only 1 alert sent
      expect(sendEmailAlert).toHaveBeenCalledTimes(1);
    });
    
    test('should close incident when service recovers', async () => {
      // Set last success to 10 minutes ago
      const state = getServiceState(testServiceUrl);
      state.lastSuccessAt = new Date(Date.now() - 10 * 60 * 1000);
      
      // Create a downtime incident
      const failResult = { ok: false, error: 'Service down', latencyMs: 1000 };
      await processHealthCheckResult(testServiceUrl, failResult, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let incident = await Downtime.findOne({ service: testServiceUrl });
      expect(incident.endAt).toBeNull();
      
      // Service recovers
      const successResult = { ok: true, statusCode: 200, latencyMs: 50 };
      await processHealthCheckResult(testServiceUrl, successResult, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check incident was closed
      incident = await Downtime.findOne({ service: testServiceUrl });
      expect(incident.endAt).not.toBeNull();
      expect(incident.status).toBe('recovered');
      expect(incident.durationMs).toBeGreaterThan(0);
    });
  });
  
  describe('Downtime Monitor Scheduler', () => {
    test('should parse monitor services from env', () => {
      const originalEnv = process.env.MONITOR_SERVICES;
      
      process.env.MONITOR_SERVICES = 'http://service1.com,http://service2.com';
      const services = downtimeMonitor.parseMonitorServices();
      
      expect(services).toEqual(['http://service1.com', 'http://service2.com']);
      
      // Restore
      process.env.MONITOR_SERVICES = originalEnv;
    });
    
    test('should get monitor configuration', () => {
      const config = downtimeMonitor.getConfig();
      
      expect(config).toHaveProperty('intervalMinutes');
      expect(config).toHaveProperty('thresholdMs');
      expect(config).toHaveProperty('timeoutMs');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('isRunning');
    });
    
    test('should run manual health check', async () => {
      const results = await downtimeMonitor.runHealthCheck();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
  
  describe('Admin API Endpoints', () => {
    let adminToken;
    
    beforeAll(async () => {
      // Create admin user for testing
      const User = require('../models/user.model');
      
      // Clean up any existing test admin
      await User.deleteOne({ email: 'admin@test.com' });
      
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true
      });
      
      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@123' });
      
      adminToken = loginRes.body.token;
    });
    
    afterAll(async () => {
      // Cleanup
      const User = require('../models/user.model');
      await User.deleteOne({ email: 'admin@test.com' });
    });
    
    test('should get downtime history (admin only)', async () => {
      // Create test incidents
      await Downtime.create({
        service: 'http://test1.com',
        startAt: new Date(),
        status: 'down',
        details: 'Test incident 1'
      });
      
      const res = await request(app)
        .get('/api/admin/downtimes')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incidents).toBeInstanceOf(Array);
      expect(res.body.data.incidents.length).toBeGreaterThan(0);
    });
    
    test('should reject non-admin access to downtimes', async () => {
      // Create regular user
      const User = require('../models/user.model');
      await User.deleteOne({ email: 'user@test.com' });
      
      await User.create({
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@test.com',
        password: 'User@123',
        role: 'user', // Changed from 'customer' to 'user'
        isActive: true
      });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'User@123' });
      
      const userToken = loginRes.body.token;
      
      const res = await request(app)
        .get('/api/admin/downtimes')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(403);
      
      // Cleanup
      await User.deleteOne({ email: 'user@test.com' });
    });
    
    test('should trigger manual health check', async () => {
      const res = await request(app)
        .post('/api/admin/downtimes/test')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeInstanceOf(Array);
    });
    
    test('should get monitor configuration', async () => {
      const res = await request(app)
        .get('/api/admin/downtimes/monitor/config')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.config).toBeDefined();
    });
    
    test('should get downtime statistics', async () => {
      // Create test incidents
      await Downtime.create([
        {
          service: 'http://test1.com',
          startAt: new Date(Date.now() - 86400000), // 1 day ago
          endAt: new Date(),
          durationMs: 3600000, // 1 hour
          status: 'recovered'
        },
        {
          service: 'http://test2.com',
          startAt: new Date(),
          status: 'down'
        }
      ]);
      
      const res = await request(app)
        .get('/api/admin/downtimes/stats?days=7')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIncidents).toBeGreaterThanOrEqual(2);
      expect(res.body.data.ongoingIncidents).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Integration Test: Full Downtime Cycle', () => {
    test('should handle complete downtime-recovery cycle', async () => {
      const serviceUrl = testServiceUrl;
      
      // Step 1: Service is healthy
      let result = await checkService(serviceUrl, 5000);
      expect(result.ok).toBe(true);
      
      // Step 2: Set last success to 10 minutes ago to simulate prolonged issue
      const state = getServiceState(serviceUrl);
      state.lastSuccessAt = new Date(Date.now() - 10 * 60 * 1000);
      
      // Step 3: Service goes down
      serverShouldFail = true;
      result = await checkService(serviceUrl, 5000);
      expect(result.ok).toBe(false);
      
      // Step 4: Process downtime (with 5 minute threshold, will trigger immediately)
      await processHealthCheckResult(serviceUrl, result, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 5: Verify alert sent and incident created
      expect(sendEmailAlert).toHaveBeenCalled();
      let incident = await Downtime.findOne({ service: serviceUrl });
      expect(incident).toBeDefined();
      expect(incident.status).toBe('down');
      
      // Step 6: Service recovers
      serverShouldFail = false;
      result = await checkService(serviceUrl, 5000);
      expect(result.ok).toBe(true);
      
      // Step 7: Process recovery
      await processHealthCheckResult(serviceUrl, result, 5 * 60 * 1000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 7: Verify incident closed
      incident = await Downtime.findOne({ service: serviceUrl });
      expect(incident.status).toBe('recovered');
      expect(incident.endAt).not.toBeNull();
      expect(incident.durationMs).toBeGreaterThan(0);
    }, 15000); // Increase timeout for this integration test
  });
});
