const { authorizeRoles } = require('../../middleware/roleAuth');

// Mock logger and auditLog
jest.mock('../../config/logger', () => ({
  auditLog: { accessAttempt: jest.fn() },
  logger: { warn: jest.fn(), error: jest.fn() }
}));

// Mock authenticate middleware
jest.mock('../../controllers/auth.controller', () => ({ authenticate: jest.fn() }));
// However middleware/roleAuth requires './auth' path - create a simple stub module
jest.mock('../../middleware/auth', () => ({ authenticate: jest.fn((req, res, next) => next()) }));

function mockReq(user) {
  return { user, originalUrl: '/test', method: 'GET', ip: '1.2.3.4' };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorizeRoles middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('allows when req.user has allowed role', async () => {
    const mw = authorizeRoles('admin');
    const req = mockReq({ id: '1', role: 'admin', email: 'a@b' });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('denies when user missing or not allowed', async () => {
    const mw = authorizeRoles('admin');
    const req = mockReq({ id: '1', role: 'user', email: 'u@x' });
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
