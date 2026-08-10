// Mock mailer module before loading app/controllers so that all imports use the mock
const sendEmailMock = jest.fn().mockResolvedValue({ messageId: 'test-msg' });
jest.mock('../config/mailer', () => ({
  __esModule: true,
  getTransporter: jest.fn(() => ({ sendMail: sendEmailMock })),
  sendEmail: (...args) => sendEmailMock(...args),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const Policy = require('../models/policy.model');
const Purchase = require('../models/purchase.model');
const Renewal = require('../models/renewal.model');

jest.setTimeout(30000);

describe('Renewal Notification', () => {
  let mongoServer;
  // sendEmailMock is defined above; no spy needed here since we control the mock

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    // reset mock counts
    sendEmailMock.mockClear();

    // Mock payment processing to always succeed
    const paymentService = require('../services/payment.service');
    jest.spyOn(paymentService, 'processPayment').mockResolvedValue({
      success: true,
      gatewayTransactionId: 'GTW-TEST-1',
      gatewayReceipt: { id: 'RCPT-1' }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    // cleanup logs file if exists
    const logPath = path.join(__dirname, '..', 'logs', 'renewals.log');
    try { fs.unlinkSync(logPath); } catch (err) { void err; }
  });

  it('sends renewal email and logs event', async () => {
    // Arrange: create user, policy, purchase
    const user = await User.create({
      firstName: 'Test', lastName: 'User', email: 'testuser@example.com', password: 'Password123!'
    });

    const policy = await Policy.create({ name: 'Test Policy', type: '2W', model: 'ModelX', insurer: 'TestInsurer', premium: 1000, tenure: '1 year', coverage: '100000' });

    const purchase = await Purchase.create({
      userId: user._id,
      policyId: policy._id,
      transactionId: 'PUR-TEST-1',
      status: 'success',
      amount: 1000,
      currency: 'INR',
      policyNumber: 'PN-1234',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now (eligible)
    });

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '1h' });

    // Act: call initiate renewal
    const res = await request(app)
      .post('/api/renewals/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseId: purchase._id.toString(), paymentMethod: 'card' });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);

    // Wait for async processing to complete (poll for renewal with transactionId)
    const maxTries = 30;
    let success = false;
    for (let i = 0; i < maxTries; i++) {
      const renewal = await Renewal.findOne({ purchaseId: purchase._id });
      if (renewal && renewal.status === 'success') { success = true; break; }
      // small delay
      await new Promise(r => setTimeout(r, 100));
    }

    expect(success).toBe(true);

    // Wait briefly for async email to be sent after status is updated
    const maxEmailTries = 30;
    for (let i = 0; i < maxEmailTries; i++) {
      if (sendEmailMock.mock.calls.length > 0) break;
      await new Promise(r => setTimeout(r, 100));
    }
    expect(sendEmailMock).toHaveBeenCalled();

    // Log file should contain a renewal success entry
    const logPath = path.join(__dirname, '..', 'logs', 'renewals.log');
    const logs = fs.readFileSync(logPath, 'utf8');
    expect(logs).toMatch(/RENEWAL_SUCCESS/);
    expect(logs).toMatch(/PN-1234/);
  });
});
