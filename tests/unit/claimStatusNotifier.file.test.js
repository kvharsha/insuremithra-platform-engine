jest.mock('../../config/mailer', () => ({ sendEmail: jest.fn() }));
const fs = require('fs');
const { sendClaimStatusEmail } = require('../../utils/claimStatusNotifier');
const { sendEmail } = require('../../config/mailer');

describe('claimStatusNotifier template rendering', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses template file when present and sends email', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('<p>${claimId} ${status} ${date}</p>');
    sendEmail.mockResolvedValue(true);

    const res = await sendClaimStatusEmail('x@y.com', 'CLM1', 'Approved');
    expect(res).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'x@y.com', subject: expect.any(String), html: expect.any(String) }));
  });
});
