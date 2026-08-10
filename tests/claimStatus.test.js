const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/user.model');
const Claim = require('../models/claim.model');

describe('Claim Status APIs (basic)', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Claim.deleteMany({});

    testUser = new User({ firstName: 'Alice', lastName: 'Tester', email: 'alice@test.com', password: 'Password123!', role: 'user' });
    await testUser.save();

    // login to get token
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'Password123!' });
    authToken = res.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET /api/claims/my should return empty list for new user', async () => {
    const res = await request(app).get('/api/claims/my').set('Authorization', `Bearer ${authToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
