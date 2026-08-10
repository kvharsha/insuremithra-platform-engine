const claimController = require('../../controllers/claim.controller');

jest.mock('../../models/purchase.model', () => ({ findOne: jest.fn() }));
jest.mock('../../models/claim.model', () => {
  const fn = jest.fn();
  fn.find = jest.fn();
  fn.findOne = jest.fn();
  fn.countDocuments = jest.fn();
  return fn;
});
jest.mock('../../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../../utils/claimIdGenerator', () => jest.fn(() => 'CLM-TEST-1234'));
jest.mock('../../services/storage.service', () => ({ storeClaimDocuments: jest.fn() }));

const Purchase = require('../../models/purchase.model');
const Claim = require('../../models/claim.model');
jest.mock('../../utils/claimStatusNotifier', () => ({ sendClaimStatusEmail: jest.fn() }));

const storageService = require('../../services/storage.service');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.sendFile = jest.fn();
  return res;
}

describe('claim.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('submitClaim returns 401 when unauthenticated', async () => {
    const req = { user: null, body: {} };
    const res = mockRes();
    await claimController.submitClaim(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('submitClaim validates inputs and returns 400 for missing policyId', async () => {
    const req = { user: { _id: 'U1' }, body: { reason: 'x' }, files: [] };
    const res = mockRes();
    await claimController.submitClaim(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('submitClaim returns 403 if purchase not found', async () => {
    Purchase.findOne.mockResolvedValue(null);
    const req = { user: { _id: 'U1' }, body: { policyId: 'P1', reason: 'ok' }, files: [{ originalname: 'a.pdf' }], ip: '1.2.3.4', get: () => 'ua' };
    const res = mockRes();
    await claimController.submitClaim(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('submitClaim success path stores files and returns 200', async () => {
    Purchase.findOne.mockResolvedValue({ _id: 'purchase1' });
    storageService.storeClaimDocuments.mockResolvedValue([{ filename: 'f.pdf', path: '/tmp/f.pdf' }]);
  // mock Claim constructor and save
  const saveMock = jest.fn().mockResolvedValue(true);
  Claim.mockImplementation(function (obj) { Object.assign(this, obj); this.save = saveMock; });

    const req = { user: { _id: 'U1' }, body: { policyId: 'P1', reason: 'ok' }, files: [{ originalname: 'a.pdf', path: '/tmp/a' }], ip: '1.2.3.4', get: () => 'ua' };
    const res = mockRes();
    await claimController.submitClaim(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getClaimById returns 401 if unauthenticated', async () => {
    const req = { user: null, params: { claimId: 'C1' } };
    const res = mockRes();
    await claimController.getClaimById(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('getClaimById returns 404 if not found', async () => {
    // Mock chain: Claim.findOne(...).populate(...).populate(...) resolves to null
    Claim.findOne.mockImplementation(() => ({
      populate: () => ({ populate: () => Promise.resolve(null) })
    }));
    const req = { user: { _id: 'U1' }, params: { claimId: 'C1' } };
    const res = mockRes();
    await claimController.getClaimById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateClaimStatus denies non-admin', async () => {
    const req = { user: { _id: 'U1', role: 'user' }, params: { id: 'C1' }, body: { status: 'Approved' } };
    const res = mockRes();
    await claimController.updateClaimStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('updateClaimStatus invalid status returns 400 for admin', async () => {
    const req = { user: { _id: 'U1', role: 'admin', email: 'a@b' }, params: { id: 'C1' }, body: { status: 'NotAStatus' } };
    const res = mockRes();
    await claimController.updateClaimStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getUserClaims returns mapped list for authenticated user', async () => {
    // mock chainable find().populate().sort() -> resolves to array
    const chain = {
      populate: function () { return this; },
      sort: function () { return Promise.resolve([{ _id: 'CL1', claimId: 'CL1', policyId: {}, status: 'Submitted', submittedAt: new Date(), updatedAt: new Date(), documents: [] }]); }
    };
    Claim.find.mockImplementation(() => chain);

    const req = { user: { _id: 'U1' } };
    const res = mockRes();
    await claimController.getUserClaims(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getClaimByIdDocument returns file when exists and 404 when missing', async () => {
    // mock claim with documents
  const fs = require('fs');
  // simple document with a path value; controller checks fs.existsSync on that path
  const claimObj = { claimId: 'C1', userId: { _id: 'U1' }, documents: [{ filename: 'f.pdf', path: 'some/path/f.pdf' }] };
  Claim.findOne.mockImplementation(() => ({ populate: jest.fn().mockResolvedValue(claimObj) }));
  // mock fs.existsSync to true for this test and restore after
  const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

  const req = { user: { _id: 'U1' }, params: { claimId: 'C1', filename: 'f.pdf' } };
  const res = mockRes();
  await claimController.getClaimByIdDocument(req, res);
  expect(res.sendFile).toHaveBeenCalled();
  existsSpy.mockRestore();

  // missing file path -> controller should respond 404
  Claim.findOne.mockImplementation(() => ({ populate: jest.fn().mockResolvedValue({ claimId: 'C1', userId: { _id: 'U1' }, documents: [{ filename: 'g.pdf', path: null }] }) }));
  const res2 = mockRes();
  await claimController.getClaimByIdDocument(req, res2);
  expect(res2.status).toHaveBeenCalledWith(404);
  });

  test('getAllClaimsAdmin returns 403 for non-admin and lists claims for admin', async () => {
    const reqNoAdmin = { user: { _id: 'U1', role: 'user' }, query: {} };
    const resNoAdmin = mockRes();
    await claimController.getAllClaimsAdmin(reqNoAdmin, resNoAdmin);
    expect(resNoAdmin.status).toHaveBeenCalledWith(403);

    // admin path: mock chainable find -> resolves to array, countDocuments -> number
    const claimObj = { _id: 'CL1', claimId: 'CL1', policyId: {}, userId: {}, status: 'Submitted', submittedAt: new Date(), updatedAt: new Date(), documents: [] };
    const chain = {
      populate: function () { return this; },
      sort: function () { return this; },
      skip: function () { return this; },
      limit: jest.fn().mockResolvedValue([claimObj])
    };
    Claim.find.mockImplementation(() => chain);
    Claim.countDocuments.mockResolvedValue(1);

    const reqAdmin = { user: { _id: 'ADMIN', role: 'admin' }, query: { page: '1', limit: '10' } };
    const resAdmin = mockRes();
    await claimController.getAllClaimsAdmin(reqAdmin, resAdmin);
    expect(resAdmin.status).toHaveBeenCalledWith(200);
  });

});
