const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  // Support both SMTP_* and EMAIL_* env vars for compatibility
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  // In test environment, always create a transporter so tests can mock/spy on it.
  if (process.env.NODE_ENV === 'test') {
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
    return cachedTransporter;
  }

  if (!host || !user || !pass) {
    // Mailer not configured
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    // Not configured; in dev, log and no-op
    console.warn('[mailer] Transporter not configured; skipping email send');
    return { accepted: [], rejected: [to], skipped: true };
  }
  const from = process.env.FROM_EMAIL || process.env.EMAIL_FROM || `${process.env.SMTP_USER || 'noreply@insuremithra.com'}`;
  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.info('[mailer] Email sent', { to, subject, messageId: info.messageId || info.messageId });
    return info;
  } catch (err) {
    // If SMTP auth fails (common with wrong Gmail credentials), fall back to a non-SMTP transport
    console.error('[mailer] Error sending email', err && err.message ? err.message : err);

    const message = (err && err.message) ? err.message : '';
    // Detect common SMTP auth failure indicators
    const isAuthError = /Invalid login|Invalid credentials|535|authentication/i.test(message);

    if (isAuthError) {
      try {
        console.warn('[mailer] SMTP auth failed; falling back to local JSON transport (emails will not be delivered externally).');
        const fallback = nodemailer.createTransport({ jsonTransport: true });
        const fallbackInfo = await fallback.sendMail({ from, to, subject, html, text });
        // Attach a marker so callers can see this was a fallback send
        fallbackInfo.fallback = true;
        console.info('[mailer] Email recorded via fallback transport', { to, subject });
        return fallbackInfo;
      } catch (fbErr) {
        console.error('[mailer] Fallback send also failed', fbErr && fbErr.message ? fbErr.message : fbErr);
        // Fall through to rethrow original error below
      }
    }

    throw err;
  }
}

module.exports = { getTransporter, sendEmail };
