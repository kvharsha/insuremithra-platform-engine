require('dotenv').config();
const { sendEmail, getTransporter } = require('../config/mailer');

async function run() {
  const to = process.argv[2] || process.env.TO;
  if (!to) {
    console.error('Usage: node scripts/send-to.js recipient@example.com');
    process.exit(2);
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error('[send-to] Mailer not configured. Check SMTP env vars.');
    process.exit(2);
  }

  try {
    console.log(`[send-to] Sending test email to ${to} ...`);
    const res = await sendEmail({
      to,
      subject: 'InsureMithra Deliverability Test',
      text: 'This is a deliverability test. If you receive this, SMTP can deliver to this recipient.',
      html: '<p>This is a <strong>deliverability test</strong> from InsureMithra.</p>'
    });
    console.log('[send-to] Result:', res);
    process.exit(0);
  } catch (err) {
    console.error('[send-to] Failed to send:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
