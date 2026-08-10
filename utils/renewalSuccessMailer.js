const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../config/mailer');

async function sendRenewalSuccessEmail(userEmail, userName, policyNumber, newExpiryDate) {
  const templatePath = path.join(__dirname, '..', 'templates', 'renewalSuccessEmail.html');
  let html = '';
  try {
    html = fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    void err;
    // fallback to basic message
    html = `<p>Hi ${userName},</p><p>Your policy ${policyNumber} has been renewed. New expiry: ${newExpiryDate}.</p>`;
  }

  // replace placeholders if template has them
  html = html
    .replace(/{{userName}}/g, userName)
    .replace(/{{policyNumber}}/g, policyNumber)
    .replace(/{{newExpiryDate}}/g, newExpiryDate)
    .replace(/{{renewalDate}}/g, new Date().toISOString().split('T')[0]);

  const subject = 'Your Policy Renewal is Successful';
  const info = await sendEmail({ to: userEmail, subject, html });
  return info;
}

module.exports = { sendRenewalSuccessEmail };
