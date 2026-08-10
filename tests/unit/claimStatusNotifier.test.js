jest.mock('../../config/mailer', () => ({ sendEmail: jest.fn() }));
const { sendClaimStatusEmail } = require('../../utils/claimStatusNotifier');
const { sendEmail } = require('../../config/mailer');
const fs = require('fs');

describe('claimStatusNotifier', () => {
  beforeAll(() => {
    // silence console.error to keep test output clean when sendEmail is forced to reject
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(() => {
    console.error.mockRestore && console.error.mockRestore();
  });

  test('succeeds when template missing but sendEmail resolves', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    sendEmail.mockResolvedValue(true);
    const res = await sendClaimStatusEmail('a@b', 'CLM1', 'Approved');
    expect(res).toBe(true);
  });

  test('returns false when sendEmail rejects', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    sendEmail.mockRejectedValue(new Error('boom'));
    const res = await sendClaimStatusEmail('a@b', 'CLM1', 'Rejected');
    expect(res).toBe(false);
  });
});
