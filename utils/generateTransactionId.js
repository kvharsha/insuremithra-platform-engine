const crypto = require('crypto');

function generateTransactionId(prefix = '') {
  return prefix + crypto.randomBytes(6).toString('hex');
}

module.exports = generateTransactionId;
