const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { authenticate, validateTokenFormat } = require('../middleware/auth');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

test('authenticate middleware accepts a valid token', async () => {
  const user = new User({ firstName: 'JWT', lastName: 'User', email: 'jwt@example.com', password: 'Abcd1234!' });
  await user.save();

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  const req = { header: () => `Bearer ${token}` };
  const res = mockResponse();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.user).toBeDefined();
  expect(req.user.email).toBe('jwt@example.com');
});

test('authenticate rejects tampered token', async () => {
  const user = new User({ firstName: 'Tamper', lastName: 'User', email: 'tamper@example.com', password: 'Abcd1234!' });
  await user.save();

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');

  const req = { header: () => `Bearer ${tampered}` };
  const res = mockResponse();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
  expect(next).not.toHaveBeenCalled();
});

test('authenticate rejects expired token', async () => {
  const user = new User({ firstName: 'Exp', lastName: 'User', email: 'exp@example.com', password: 'Abcd1234!' });
  await user.save();

  // create token with exp in the past
  const expired = jwt.sign({ userId: user._id, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);

  const req = { header: () => `Bearer ${expired}` };
  const res = mockResponse();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
  expect(next).not.toHaveBeenCalled();
});

test('authenticate rejects missing token', async () => {
  // Ensure req.query exists so middleware doesn't throw when checking req.query.token
  const req = { header: () => null, query: {} };
  const res = mockResponse();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
});

test('authenticate rejects token signed with wrong key', async () => {
  const user = new User({ firstName: 'WrongKey', lastName: 'User', email: 'wrongkey@example.com', password: 'Abcd1234!' });
  await user.save();

  const otherToken = jwt.sign({ userId: user._id }, 'some_other_secret');

  const req = { header: () => `Bearer ${otherToken}` };
  const res = mockResponse();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
});

test('validateTokenFormat rejects missing or malformed Authorization header', () => {
  const req1 = { header: () => null };
  const res1 = mockResponse();
  const next1 = jest.fn();
  validateTokenFormat(req1, res1, next1);
  expect(res1.status).toHaveBeenCalledWith(401);
  expect(res1.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });

  const req2 = { header: () => 'BadFormat token' };
  const res2 = mockResponse();
  const next2 = jest.fn();
  validateTokenFormat(req2, res2, next2);
  expect(res2.status).toHaveBeenCalledWith(401);
  expect(res2.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
});
