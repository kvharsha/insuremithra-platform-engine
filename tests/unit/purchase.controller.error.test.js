const purchaseController = require('../../controllers/purchase.controller');

jest.mock('../../models/purchase.model', () => {
  const fn = jest.fn();
  fn.findById = jest.fn();
  fn.find = jest.fn();
  return fn;
});
jest.mock('../../models/policy.model', () => ({ findById: jest.fn() }));
jest.mock('../../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../../utils/generatePolicyPDF', () => jest.fn());

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

describe('purchase.controller error and pdf paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('initiatePurchase handles save() throwing and returns 500', async () => {
    Policy.findById.mockResolvedValue({ _id: 'P1', premium: 100 });
    // Purchase constructor that has save which rejects
    const saveMock = jest.fn().mockRejectedValue(new Error('save failed'));
  Purchase.mockImplementation(function (_obj) { this._id = 'X'; this.save = saveMock; });

    const req = { user: { _id: 'U1' }, body: { policyId: 'P1' } };
    const res = mockRes();
    await purchaseController.initiatePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('completePurchase tolerates pdf generation failure and still returns 200', async () => {
    // purchase in initiated status
    const saveMock = jest.fn().mockResolvedValue(true);
    const purchaseObj = { userId: 'U1', policyId: 'P1', status: 'initiated', save: saveMock, _id: 'PURX' };
    Purchase.findById.mockResolvedValue(purchaseObj);
    Policy.findById.mockResolvedValue({ _id: 'P1' });
    User.findById.mockResolvedValue({ _id: 'U1' });
    // generatePolicyPDF rejects
    generatePolicyPDF.mockRejectedValue(new Error('pdf failed'));

    const req = { user: { _id: 'U1' }, body: { purchaseId: 'PURX' } };
    const res = mockRes();
    await purchaseController.completePurchase(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    // final save should have been called (purchase saved twice in controller)
    expect(saveMock).toHaveBeenCalled();
  });
});
