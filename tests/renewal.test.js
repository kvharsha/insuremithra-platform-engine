const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user.model');
const Policy = require('../models/policy.model');
const Purchase = require('../models/purchase.model');
const Renewal = require('../models/renewal.model');

describe('Policy Renewal API', () => {
  let testUser;
  let authToken;
  let testPolicy;
  let testPurchase;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra_test');
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Policy.deleteMany({});
    await Purchase.deleteMany({});
    await Renewal.deleteMany({});
    
    // Register a test user using the API (this will properly hash the password)
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'TestPassword123!',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        }
      });

    // Get the created user
    testUser = await User.findOne({ email: 'john.doe@test.com' });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@test.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginResponse.body.token;

    // Create a test policy
    testPolicy = new Policy({
      name: 'Comprehensive Car Insurance',
      type: '4W',
      model: 'Sedan',
      insurer: 'Test Insurance Co',
      premium: 15000,
      coverage: '500000',
      tenure: '1 year',
      description: 'Full coverage car insurance',
      benefits: ['Accident cover', 'Third party liability']
    });
    await testPolicy.save();

    // Create a test purchase with expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 5); // Expires in 5 days
    
    testPurchase = new Purchase({
      userId: testUser._id,
      policyId: testPolicy._id,
      transactionId: 'TEST-PURCHASE-001',
      status: 'success',
      amount: testPolicy.premium,
      currency: 'INR',
      policyNumber: 'POL-12345',
      expiryDate: expiryDate,
      renewalStatus: 'active'
    });
    await testPurchase.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/renewals/eligibility/:purchaseId', () => {
    it('should return eligible for purchase expiring in 5 days', async () => {
      const response = await request(app)
        .get(`/api/renewals/eligibility/${testPurchase._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.eligible).toBe(true);
      expect(response.body.daysLeft).toBeLessThanOrEqual(7);
      expect(response.body.renewalAmount).toBe(testPolicy.premium);
      expect(response.body.policyName).toBe(testPolicy.name);
    });

    it('should return not eligible for purchase expiring in 10 days', async () => {
      // Update purchase to expire in 10 days
      testPurchase.expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      await testPurchase.save();

      const response = await request(app)
        .get(`/api/renewals/eligibility/${testPurchase._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.daysLeft).toBeGreaterThan(7);
    });

    it('should return 404 for non-existent purchase', async () => {
      const fakePurchaseId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/renewals/eligibility/${fakePurchaseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Purchase not found');
    });

    it('should return 403 when user tries to check eligibility for another user\'s purchase', async () => {
      // Create another user
      const otherUser = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'TestPassword123!',
        role: 'user'
      });
      await otherUser.save();

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane.smith@test.com',
          password: 'TestPassword123!'
        });
      
      const otherAuthToken = otherLoginResponse.body.token;

      const response = await request(app)
        .get(`/api/renewals/eligibility/${testPurchase._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to renew this policy');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get(`/api/renewals/eligibility/${testPurchase._id}`)
        .expect(401);
    });
  });

  describe('POST /api/renewals/initiate', () => {
    it('should successfully initiate renewal for eligible purchase', async () => {
      const response = await request(app)
        .post('/api/renewals/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId: testPurchase._id,
          paymentMethod: 'card'
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.transactionId).toMatch(/^REN-/);
      expect(response.body.status).toBe('processing');

      // Check renewal record was created
      const renewal = await Renewal.findOne({ transactionId: response.body.transactionId });
      expect(renewal).toBeDefined();
      expect(renewal.userId.toString()).toBe(testUser._id.toString());
      expect(renewal.purchaseId.toString()).toBe(testPurchase._id.toString());
    });

    it('should reject renewal for purchase not in renewal window', async () => {
      // Update purchase to expire in 15 days
      testPurchase.expiryDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await testPurchase.save();

      const response = await request(app)
        .post('/api/renewals/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId: testPurchase._id,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.code).toBe('NOT_ELIGIBLE');
    });

    it('should reject renewal if one is already in progress', async () => {
      // Create an existing pending renewal
      await Renewal.create({
        userId: testUser._id,
        purchaseId: testPurchase._id,
        transactionId: 'REN-EXISTING-001',
        status: 'processing',
        amount: testPolicy.premium,
        paymentMethod: 'card',
        oldExpiryDate: testPurchase.expiryDate
      });

      const response = await request(app)
        .post('/api/renewals/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId: testPurchase._id,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.code).toBe('RENEWAL_IN_PROGRESS');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/renewals/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId: testPurchase._id
          // Missing paymentMethod
        })
        .expect(400);

      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('Renewal Payment Flow', () => {
    it('should update expiry date on successful payment', (done) => {
      request(app)
        .post('/api/renewals/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId: testPurchase._id,
          paymentMethod: 'card'
        })
        .expect(202)
        .end(async (err, response) => {
          if (err) return done(err);

          const transactionId = response.body.transactionId;

          // Wait for async payment processing (max 5 seconds)
          setTimeout(async () => {
            try {
              const renewal = await Renewal.findOne({ transactionId });
              
              // Most renewals should succeed in sandbox (90% success rate)
              if (renewal.status === 'success') {
                expect(renewal.newExpiryDate).toBeDefined();
                
                // Check purchase was updated
                const updatedPurchase = await Purchase.findById(testPurchase._id);
                expect(updatedPurchase.expiryDate).not.toEqual(testPurchase.expiryDate);
                expect(updatedPurchase.renewalStatus).toBe('renewed');
                expect(updatedPurchase.lastRenewedAt).toBeDefined();
                expect(updatedPurchase.renewalHistory).toHaveLength(1);
                expect(updatedPurchase.renewalHistory[0].transactionId).toBe(transactionId);
              } else if (renewal.status === 'failed') {
                expect(renewal.errorMessage).toBeDefined();
                
                // Purchase should not be updated on failure
                const updatedPurchase = await Purchase.findById(testPurchase._id);
                expect(updatedPurchase.expiryDate).toEqual(testPurchase.expiryDate);
                expect(updatedPurchase.renewalStatus).toBe('active');
              }
          
              done();
            } catch (error) {
              done(error);
            }
          }, 4000);
        });
    }, 10000); // 10 second timeout for this test
  });

  describe('GET /api/renewals/:renewalId', () => {
    it('should get renewal status for user\'s renewal', async () => {
      // Create a completed renewal
      const renewal = await Renewal.create({
        userId: testUser._id,
        purchaseId: testPurchase._id,
        transactionId: 'REN-TEST-002',
        status: 'success',
        amount: testPolicy.premium,
        currency: 'INR',
        paymentMethod: 'card',
        oldExpiryDate: testPurchase.expiryDate,
        newExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        completedAt: new Date()
      });

      const response = await request(app)
        .get(`/api/renewals/${renewal._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.renewal.transactionId).toBe('REN-TEST-002');
      expect(response.body.renewal.status).toBe('success');
      expect(response.body.purchase).toBeDefined();
    });

    it('should return 403 for another user\'s renewal', async () => {
      // Create another user
      const otherUser = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        password: 'TestPassword123!',
        role: 'user'
      });
      await otherUser.save();

      // Create renewal for original user
      const renewal = await Renewal.create({
        userId: testUser._id,
        purchaseId: testPurchase._id,
        transactionId: 'REN-TEST-003',
        status: 'success',
        amount: testPolicy.premium,
        paymentMethod: 'card',
        oldExpiryDate: testPurchase.expiryDate,
        newExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane.smith@test.com',
          password: 'TestPassword123!'
        });
      
      const otherAuthToken = otherLoginResponse.body.token;

      const response = await request(app)
        .get(`/api/renewals/${renewal._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.code).toBe('UNAUTHORIZED_ACCESS');
    });
  });

  describe('GET /api/renewals/my', () => {
    it('should get user\'s renewal history', async () => {
      // Create multiple renewals for the user
      await Renewal.create([
        {
          userId: testUser._id,
          purchaseId: testPurchase._id,
          transactionId: 'REN-HIST-001',
          status: 'success',
          amount: testPolicy.premium,
          paymentMethod: 'card',
          oldExpiryDate: new Date('2024-01-01'),
          newExpiryDate: new Date('2025-01-01'),
          completedAt: new Date('2024-01-01')
        },
        {
          userId: testUser._id,
          purchaseId: testPurchase._id,
          transactionId: 'REN-HIST-002',
          status: 'failed',
          amount: testPolicy.premium,
          paymentMethod: 'upi',
          oldExpiryDate: new Date('2024-06-01'),
          errorMessage: 'Payment declined',
          completedAt: new Date('2024-06-01')
        }
      ]);

      const response = await request(app)
        .get('/api/renewals/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.renewals).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.renewals[0].transactionId).toBe('REN-HIST-002'); // Most recent first
      expect(response.body.renewals[1].transactionId).toBe('REN-HIST-001');
    });

    it('should support pagination', async () => {
      // Create 15 renewals
      const renewals = [];
      for (let i = 1; i <= 15; i++) {
        renewals.push({
          userId: testUser._id,
          purchaseId: testPurchase._id,
          transactionId: `REN-PAGE-${i.toString().padStart(3, '0')}`,
          status: 'success',
          amount: testPolicy.premium,
          paymentMethod: 'card',
          oldExpiryDate: new Date(),
          newExpiryDate: new Date(),
          createdAt: new Date(Date.now() + i * 1000) // Stagger creation times
        });
      }
      await Renewal.create(renewals);

      const response = await request(app)
        .get('/api/renewals/my?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.renewals).toHaveLength(5); // 5 remaining on page 2
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
      expect(response.body.pagination.total).toBe(15);
    });
  });
});
