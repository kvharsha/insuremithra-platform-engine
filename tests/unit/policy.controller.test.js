const policyController = require('../../controllers/policy.controller');

jest.mock('../../models/policy.model', () => {
  const fn = jest.fn();
  fn.find = jest.fn();
  fn.findById = jest.fn();
  return fn;
});
const Policy = require('../../models/policy.model');

const mongoose = require('mongoose');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('policy.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('searchPolicies returns list based on filters', async () => {
    // Mock chain: Policy.find(filters).sort({}).limit(1000)
    Policy.find.mockImplementation(() => ({
      sort: () => ({ limit: () => Promise.resolve([{ _id: '1' }]) })
    }));
    const req = { query: { type: 'COMPREHENSIVE' } };
    const res = mockRes();
    await policyController.searchPolicies(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  test('comparePolicies rejects non-array body', async () => {
    const req = { body: { policyIds: 'notarray' } };
    const res = mockRes();
    await policyController.comparePolicies(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('comparePolicies rejects wrong length', async () => {
    const req = { body: { policyIds: ['a'] } };
    const res = mockRes();
    await policyController.comparePolicies(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('comparePolicies rejects duplicate ids', async () => {
    const req = { body: { policyIds: ['a', 'a'] } };
    const res = mockRes();
    await policyController.comparePolicies(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('comparePolicies rejects invalid ObjectId', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
    const req = { body: { policyIds: ['badid','other'] } };
    const res = mockRes();
    await policyController.comparePolicies(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    mongoose.Types.ObjectId.isValid.mockRestore();
  });

  test('getPolicyById invalid format 400', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
    const req = { params: { id: 'bad' } };
    const res = mockRes();
    await policyController.getPolicyById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    mongoose.Types.ObjectId.isValid.mockRestore();
  });

  test('getPolicyById not found 404', async () => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
    Policy.findById.mockResolvedValue(null);
    const req = { params: { id: '1' } };
    const res = mockRes();
    await policyController.getPolicyById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    mongoose.Types.ObjectId.isValid.mockRestore();
  });

});
