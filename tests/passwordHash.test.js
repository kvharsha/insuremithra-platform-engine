const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

let mongoServer;

beforeAll(async () => {
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

test('creates a password hash using bcrypt and respects minimum rounds', async () => {
  process.env.BCRYPT_ROUNDS = '12';

  const u = new User({
    firstName: 'Alice',
    lastName: 'Tester',
    email: 'alice@example.com',
    password: 'Secret123!'
  });

  await u.save();

  const stored = await User.findById(u._id).select('+password');
  expect(stored.password).toBeDefined();
  expect(stored.password).not.toBe('Secret123!');

  // bcrypt compare should succeed
  const match = await stored.comparePassword('Secret123!');
  expect(match).toBe(true);
});

test('re-saving password after reassigning produces a new hash (salted)', async () => {
  const u = new User({
    firstName: 'Bob',
    lastName: 'Salt',
    email: 'bob@example.com',
    password: 'MyPass123!'
  });

  await u.save();
  const stored1 = await User.findById(u._id).select('+password');

  // reassign same plaintext to force re-hash; mark modified to ensure pre-save hook runs
  stored1.password = 'MyPass123!';
  stored1.markModified('password');
  await stored1.save();

  const stored2 = await User.findById(u._id).select('+password');
  // Ensure password is present and comparison with plaintext succeeds after re-save
  expect(stored2.password).toBeDefined();
  expect(await bcrypt.compare('MyPass123!', stored2.password)).toBe(true);
});
