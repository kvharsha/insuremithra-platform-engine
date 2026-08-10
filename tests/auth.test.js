const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user.model');

describe('Authentication API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    
    // Create a test user
    testUser = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'TestPassword123!',
      phone: '+1234567890',
      role: 'user'
    });
    await testUser.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'TestPassword123!',
        phone: '+1234567891'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully. Please verify your email.');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should fail to register with duplicate email', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'john.doe@test.com', // Same as existing user
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('User already exists with this email address.');
    });

    it('should fail to register with invalid email', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'invalid-email',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail to register with weak password', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'john.doe@test.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      
      authToken = response.body.token;
    });

    it('should fail to login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid email or password.');
    });

    it('should fail to login with invalid password', async () => {
      const loginData = {
        email: 'john.doe@test.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid email or password.');
    });

    it('should lock account after multiple failed attempts', async () => {
      const loginData = {
        email: 'john.doe@test.com',
        password: 'WrongPassword123!'
      };

      // Attempt login 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body.error).toBe('Account is temporarily locked due to multiple failed login attempts.');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'john.doe@test.com' })
        .expect(200);

      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
    });

    it('should return same message for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('john.doe@test.com');
      expect(response.body.user.firstName).toBe('John');
    });

    it('should fail to get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Align with current validateTokenFormat/authenticate middleware response shape
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should fail to get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Align with current authenticate() middleware response shape
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });
});

describe('Profile API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    
    // Create a test user
    testUser = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'TestPassword123!',
      phone: '+1234567890',
      role: 'user'
    });
    await testUser.save();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@test.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('john.doe@test.com');
      expect(response.body.user.firstName).toBe('John');
    });
  });

  describe('PUT /api/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Johnny',
        lastName: 'Doe',
        phone: '+1234567891'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully.');
      expect(response.body.user.firstName).toBe('Johnny');
    });

    it('should fail to update with invalid data', async () => {
      const updateData = {
        firstName: '', // Invalid: empty string
        phone: 'invalid-phone'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/profile/change-password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully.');
    });

    it('should fail to change password with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/profile/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Current password is incorrect.');
    });
  });
});
