const claimController = require('../../controllers/claim.controller');

jest.mock('../../models/claim.model', () => {
  const fn = jest.fn();
  fn.findOne = jest.fn();
  fn.find = jest.fn();
  fn.countDocuments = jest.fn();
  return fn;
});
jest.mock('../../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../../utils/claimStatusNotifier', () => ({ sendClaimStatusEmail: jest.fn() }));

const Claim = require('../../models/claim.model');
const User = require('../../models/user.model');
const { sendClaimStatusEmail } = require('../../utils/claimStatusNotifier');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('claim.controller extra paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateClaimStatus as admin - success path', async () => {
    // existing claim
    const saveMock = jest.fn().mockResolvedValue(true);
    const claimObj = {
      claimId: 'C123',
      status: 'Submitted',
      history: [],
      userId: 'U_OWNER',
      save: saveMock
    };
    Claim.findOne.mockResolvedValue(claimObj);
    User.findById.mockResolvedValue({ _id: 'U_OWNER', email: 'owner@test.com' });
    sendClaimStatusEmail.mockResolvedValue(true);

    const req = { user: { _id: 'ADMIN', role: 'admin', email: 'a@b' }, params: { id: 'C123' }, body: { status: 'Approved' } };
    const res = mockRes();

    await claimController.updateClaimStatus(req, res);

    expect(Claim.findOne).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalled();
    expect(sendClaimStatusEmail).toHaveBeenCalledWith('owner@test.com', 'C123', 'Approved');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateClaimStatus when db throws returns 500', async () => {
    Claim.findOne.mockImplementation(() => { throw new Error('db broken'); });
    const req = { user: { _id: 'ADMIN', role: 'admin' }, params: { id: 'C123' }, body: { status: 'Approved' } };
    const res = mockRes();
    await claimController.updateClaimStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getClaimById returns populated claim for owner', async () => {
    const claimObj = {
      claimId: 'C999',
      userId: { _id: 'U1' },
      status: 'Submitted',
      documents: []
    };
    // chainable populate calls resolve to the object
    Claim.findOne.mockImplementation(() => ({ populate: () => ({ populate: () => Promise.resolve(claimObj) }) }));

    const req = { user: { _id: 'U1', role: 'user' }, params: { claimId: 'C999' } };
    const res = mockRes();

    await claimController.getClaimById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: claimObj }));
  });
});
