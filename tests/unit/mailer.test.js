describe('central mailer', () => {
  it('uses transporter.sendMail when configured', async () => {
    const nodemailer = require('nodemailer');
    const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'msg-42' });
    nodemailer.createTransport = jest.fn().mockReturnValue({ sendMail: sendMailMock });

    const { sendEmail } = require('../../config/mailer');
    const info = await sendEmail({ to: 'a@b.com', subject: 'test', html: '<p>x</p>' });
    expect(sendMailMock).toHaveBeenCalled();
    expect(info).toBeDefined();
  });
});
