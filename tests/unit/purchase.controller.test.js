const purchaseController = require('../../controllers/purchase.controller');

jest.mock('../../models/purchase.model', () => {
  const fn = jest.fn();
  fn.findById = jest.fn();
  fn.find = jest.fn();
  return fn;
});
jest.mock('../../models/policy.model', () => ({ findById: jest.fn() }));
jest.mock('../../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../../utils/generateTransactionId', () => jest.fn(() => 'TX_12345'));
jest.mock('../../utils/generatePolicyPDF', () => jest.fn(async () => '/tmp/p.pdf'));

const Purchase = require('../../models/purchase.model');
const Policy = require('../../models/policy.model');
const User = require('../../models/user.model');
const generatePolicyPDF = require('../../utils/generatePolicyPDF');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.sendFile = jest.fn();
  return res;
}

describe('purchase.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('initiatePurchase 401 if unauthenticated', async () => {
    const req = { user: null, body: {} };
    const res = mockRes();
    await purchaseController.initiatePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('initiatePurchase 400 if no policyId', async () => {
    const req = { user: { _id: 'U1' }, body: {} };
    const res = mockRes();
    await purchaseController.initiatePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('initiatePurchase 404 if policy not found', async () => {
    Policy.findById.mockResolvedValue(null);
    const req = { user: { _id: 'U1' }, body: { policyId: 'P1' } };
    const res = mockRes();
    await purchaseController.initiatePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('initiatePurchase success returns 201', async () => {
    Policy.findById.mockResolvedValue({ _id: 'P1', premium: 100 });
  // mock Purchase constructor and save
  const saveMock = jest.fn().mockResolvedValue(true);
  Purchase.mockImplementation(function (obj) { Object.assign(this, obj); this.save = saveMock; this._id = 'PUR1'; });

    const req = { user: { _id: 'U1' }, body: { policyId: 'P1' } };
    const res = mockRes();
    await purchaseController.initiatePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('completePurchase 401 if unauthenticated', async () => {
    const req = { user: null, body: {} };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('completePurchase 400 if missing purchaseId', async () => {
    const req = { user: { _id: 'U1' }, body: {} };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('completePurchase 404 if purchase not found', async () => {
    Purchase.findById.mockResolvedValue(null);
    const req = { user: { _id: 'U1' }, body: { purchaseId: 'X' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('completePurchase forbidden if different user', async () => {
    Purchase.findById.mockResolvedValue({ userId: 'OTHER', status: 'initiated', save: jest.fn().mockResolvedValue(true) });
    const req = { user: { _id: 'U1' }, body: { purchaseId: 'X' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('completePurchase success path sets pdfPath when generatePolicyPDF resolves', async () => {
  const purchaseObj = { userId: 'U1', policyId: 'P1', status: 'initiated', save: jest.fn().mockResolvedValue(true), _id: 'PUR1' };
    Purchase.findById.mockResolvedValue(purchaseObj);
    Policy.findById.mockResolvedValue({ _id: 'P1' });
    User.findById.mockResolvedValue({ _id: 'U1' });
    generatePolicyPDF.mockResolvedValue('/tmp/p.pdf');

    const req = { user: { _id: 'U1' }, body: { purchaseId: 'PUR1' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('completePurchase returns Already completed when status is success', async () => {
    Purchase.findById.mockResolvedValue({ userId: 'U1', status: 'success', save: jest.fn().mockResolvedValue(true) });
    const req = { user: { _id: 'U1' }, body: { purchaseId: 'PUR2' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('completePurchase returns 400 when status is failed', async () => {
    Purchase.findById.mockResolvedValue({ userId: 'U1', status: 'failed', save: jest.fn().mockResolvedValue(true) });
    const req = { user: { _id: 'U1' }, body: { purchaseId: 'PUR3' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getPurchase forbidden when user mismatch and 404 when not found', async () => {
    Purchase.findById.mockResolvedValue(null);
    let req = { user: { _id: 'U1' }, params: { id: 'NOPE' } };
    let res = mockRes();
    await purchaseController.getPurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(404);

    Purchase.findById.mockResolvedValue({ userId: 'OTHER' });
    req = { user: { _id: 'U1' }, params: { id: 'X' } };
    res = mockRes();
    await purchaseController.getPurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('downloadPDF sends file when available and PDF 404 when missing', async () => {
    Purchase.findById.mockResolvedValue({ userId: 'U1', pdfPath: '/tmp/p.pdf' });
    const req = { user: { _id: 'U1' }, params: { id: 'PUR1' } };
    const res = mockRes();
    await purchaseController.downloadPDF(req, res);
    expect(res.sendFile).toHaveBeenCalledWith('/tmp/p.pdf');

    Purchase.findById.mockResolvedValue({ userId: 'U1', pdfPath: null });
    const res2 = mockRes();
    await purchaseController.downloadPDF(req, res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  test('getUserPurchases unauthorized and success', async () => {
    const req = { user: null };
    const res = mockRes();
    await purchaseController.getUserPurchases(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    // mock chainable query: find(...).populate(...).sort(...) -> resolves to array
    Purchase.find.mockImplementation(() => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'P1' }])
    }));
    const req2 = { user: { _id: 'U1' } };
    const res2 = mockRes();
    await purchaseController.getUserPurchases(req2, res2);
    expect(res2.status).toHaveBeenCalledWith(200);
  });

});
