require('dotenv').config();
const { sendRenewalSuccessEmail } = require('../utils/renewalSuccessMailer');

async function run() {
  const to = process.argv[2];
  const policyNumber = process.argv[3] || 'POLICY-TEST-001';
  const newExpiry = process.argv[4] || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];

  if (!to) {
    console.error('Usage: node scripts/send-renewal-notify.js recipient@example.com [policyNumber] [newExpiryDate]');
    process.exit(2);
  }

  try {
    console.log(`[send-renewal-notify] Sending renewal success to ${to} for ${policyNumber} (new expiry ${newExpiry})`);
    const info = await sendRenewalSuccessEmail(to, to.split('@')[0], policyNumber, newExpiry);
    console.log('[send-renewal-notify] Result:', info);
    process.exit(0);
  } catch (err) {
    console.error('[send-renewal-notify] Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
