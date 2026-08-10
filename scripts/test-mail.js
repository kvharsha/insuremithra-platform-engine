require('dotenv').config();
const { sendEmail, getTransporter } = require('../config/mailer');

async function run() {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.error('[test-mail] Transporter is not configured. Check SMTP env variables.');
      process.exit(2);
    }

    const to = process.env.SMTP_USER || process.env.EMAIL_USER;
    if (!to) {
      console.error('[test-mail] No recipient found (SMTP_USER or EMAIL_USER).');
      process.exit(2);
    }

    console.log(`[test-mail] Sending test email to ${to} ...`);
    const res = await sendEmail({
      to,
      subject: 'InsureMithra Test Email',
      text: 'This is a test email from InsureMithra. If you received this, SMTP is configured correctly.',
      html: '<p>This is a test email from <strong>InsureMithra</strong>. If you received this, SMTP is configured correctly.</p>'
    });

    console.log('[test-mail] Email result:', res);
    process.exit(0);
  } catch (err) {
    console.error('[test-mail] Failed to send email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
