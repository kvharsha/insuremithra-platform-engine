// removed unused `fs` and `path` requires

describe('renewalSuccessMailer utility', () => {
  it('loads template and calls transporter.sendMail', async () => {
    // Mock nodemailer
    const nodemailer = require('nodemailer');
    const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
    nodemailer.createTransport = jest.fn().mockReturnValue({ sendMail: sendMailMock });

    const { sendRenewalSuccessEmail } = require('../../utils/renewalSuccessMailer');

    const res = await sendRenewalSuccessEmail('user@example.com', 'User', 'POL-1', '2026-11-16');
    expect(sendMailMock).toHaveBeenCalled();
    expect(res).toBeDefined();
  });
});
