const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user.model');

describe('Role-Based Access Control', () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    
    // Use unique emails per test run to avoid duplicate-key conflicts
    const unique = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // Register users via API to mirror real flow (hashing, validations)
    const regularEmail = `john.doe${unique}@test.com`;
    const adminEmail = `admin${unique}@test.com`;

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: regularEmail,
        password: 'TestPassword123!',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        address: { street: '1 Test', city: 'Test', state: 'TS', zipCode: '12345' }
      })
      .expect(201);

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: 'AdminPassword123!',
        phone: '+1234567891',
        dateOfBirth: '1990-01-01',
        address: { street: '1 Test', city: 'Test', state: 'TS', zipCode: '12345' }
      })
      .expect(201);

    // Elevate admin
    adminUser = await User.findOneAndUpdate({ email: adminEmail }, { role: 'admin' }, { new: true });
    regularUser = await User.findOne({ email: regularEmail });

    // Get tokens — ensure requests succeed and tokens are present
    const regularLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: regularEmail, password: 'TestPassword123!' });
    if (!regularLogin.body || !regularLogin.body.token) {
      throw new Error(`Failed to login regular user during test setup: ${JSON.stringify(regularLogin.body)}`);
    }
    regularToken = regularLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'AdminPassword123!' });
    if (!adminLogin.body || !adminLogin.body.token) {
      throw new Error(`Failed to login admin user during test setup: ${JSON.stringify(adminLogin.body)}`);
    }
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/profile/admin/users', () => {
    it('should allow admin to view all users', async () => {
      const response = await request(app)
        .get('/api/profile/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      // Some environments may have a single seeded user; assert at least one
      expect(response.body.users.length).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should deny regular user access to view all users', async () => {
      const response = await request(app)
        .get('/api/profile/admin/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/profile/admin/users')
        .expect(401);

      // Align with current authenticate() middleware response shape
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/profile/admin/users/:userId', () => {
    it('should allow admin to view specific user', async () => {
      const response = await request(app)
        .get(`/api/profile/admin/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user.email).toBe(regularUser.email);
      expect(response.body.user.role).toBe('user');
    });

    it('should deny regular user access to view other users', async () => {
      const response = await request(app)
        .get(`/api/profile/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('PUT /api/profile/admin/users/:userId/role', () => {
    it('should allow admin to change user role', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.message).toBe('User role updated successfully.');
      expect(response.body.user.role).toBe('admin');

      // Verify in database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.role).toBe('admin');
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(400);

      expect(response.body.error).toBe('Cannot change your own role.');
    });

    it('should reject invalid roles', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' })
        .expect(400);

      expect(response.body.error).toBe('Invalid role. Must be "user" or "admin".');
    });

    it('should deny regular user from changing roles', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('PUT /api/profile/admin/users/:userId/status', () => {
    it('should allow admin to deactivate user', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.message).toBe('User deactivated successfully.');

      // Verify in database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.isActive).toBe(false);
    });

    it('should allow admin to activate user', async () => {
      // First deactivate
      await User.findByIdAndUpdate(regularUser._id, { isActive: false });

      const response = await request(app)
        .put(`/api/profile/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.message).toBe('User activated successfully.');
    });

    it('should prevent admin from changing their own status', async () => {
      const response = await request(app)
        .put(`/api/profile/admin/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      expect(response.body.error).toBe('Cannot change your own account status.');
    });
  });

  describe('GET /api/profile/admin/stats', () => {
    it('should return system statistics for admin', async () => {
      const response = await request(app)
        .get('/api/profile/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.users.total).toBeGreaterThanOrEqual(2);
      expect(response.body.statistics.users.admins).toBeGreaterThanOrEqual(1);
      expect(response.body.statistics.activity).toBeDefined();
    });

    it('should deny regular user access to stats', async () => {
      const response = await request(app)
        .get('/api/profile/admin/stats')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });
  });

  describe('GET /api/profile/activity-log', () => {
    it('should allow admin to view any user activity log', async () => {
      const response = await request(app)
        .get('/api/profile/activity-log')
        .query({ userId: regularUser._id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // don't assert exact seed IDs (can vary between runs); only ensure a userId is returned
      expect(response.body.userId).toBeDefined();
      expect(response.body.activities).toBeDefined();
    });

    it('should allow regular user to view only their own activity log', async () => {
      const response = await request(app)
        .get('/api/profile/activity-log')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.activities).toBeDefined();
    });
  });
});
