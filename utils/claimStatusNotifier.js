const { sendEmail } = require('../config/mailer');
const path = require('path');
const fs = require('fs');

const templatePath = path.join(process.cwd(), 'templates', 'claimStatusEmail.html');

function renderTemplate(claimId, status, date) {
  try {
    if (!fs.existsSync(templatePath)) {
      // simple fallback
      return `<p>Your claim <strong>${claimId}</strong> status has changed to <strong>${status}</strong> on ${date}.</p>`;
    }
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace(/\$\{claimId\}/g, claimId);
    html = html.replace(/\$\{status\}/g, status);
    html = html.replace(/\$\{date\}/g, date);
    return html;
  } catch (err) {
    void err;
    return `<p>Your claim <strong>${claimId}</strong> status has changed to <strong>${status}</strong> on ${date}.</p>`;
  }
}

async function sendClaimStatusEmail(userEmail, claimId, newStatus) {
  const subject = `Your claim ${claimId} is now ${newStatus}`;
  const date = new Date().toLocaleString();
  const html = renderTemplate(claimId, newStatus, date);
  try {
    await sendEmail({ to: userEmail, subject, html });
    return true;
  } catch (_err) {
    console.error('Failed to send claim status email', _err);
    return false;
  }
}

module.exports = { sendClaimStatusEmail };
