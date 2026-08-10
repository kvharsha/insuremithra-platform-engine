const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user.model');

// Ensure the test route is registered on the app
const { requireAdmin } = require('../middleware/roleAuth');
// Register a simple protected route for testing
app.get('/__test/admin-only', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Admin access granted' });
});

describe('middleware/roleAuth', () => {
  let regularUser, adminUser, regularToken, adminToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Register regular user
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Reg',
        lastName: 'User',
        email: 'reg.user@test.com',
        password: 'TestPass123!',
        role: 'user',
        dateOfBirth: '1990-01-01'
      })
      .expect(201);

    // Register admin then elevate
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@test.com',
        password: 'AdminPass123!',
        role: 'user',
        dateOfBirth: '1990-01-01'
      })
      .expect(201);

    adminUser = await User.findOneAndUpdate({ email: 'admin.user@test.com' }, { role: 'admin' }, { new: true });
    regularUser = await User.findOne({ email: 'reg.user@test.com' });

    const regRes = await request(app).post('/api/auth/login').send({ email: regularUser.email, password: 'TestPass123!' });
    regularToken = regRes.body.token;

    const adminRes = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: 'AdminPass123!' });
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('allows admin to access admin-only route', async () => {
    const res = await request(app)
      .get('/__test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Admin access granted');
  });

  it('blocks regular user with 403', async () => {
    const res = await request(app)
      .get('/__test/admin-only')
      .set('Authorization', `Bearer ${regularToken}`)
      .expect(403);

    expect(res.body.message).toBe('Access denied');
  });

  it('blocks unauthenticated request with 401', async () => {
    const res = await request(app)
      .get('/__test/admin-only')
      .expect(401);

    // The authenticate middleware returns a structured error
    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });
});
