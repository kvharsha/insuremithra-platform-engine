require('dotenv').config();
const { sendClaimStatusEmail } = require('../utils/claimStatusNotifier');

async function run() {
  const to = process.argv[2];
  const claimId = process.argv[3] || 'TEST-CLAIM-001';
  const status = process.argv[4] || 'Under Review';

  if (!to) {
    console.error('Usage: node scripts/send-claim-notify.js recipient@example.com [claimId] [status]');
    process.exit(2);
  }

  try {
    console.log(`[send-claim-notify] Sending claim status ${status} for ${claimId} to ${to} ...`);
    const ok = await sendClaimStatusEmail(to, claimId, status);
    console.log('[send-claim-notify] sendClaimStatusEmail returned', ok);
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error('[send-claim-notify] Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
