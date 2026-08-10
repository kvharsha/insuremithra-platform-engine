const crypto = require('crypto');

/**
 * Generate a unique transaction ID
 * Format: REN-TIMESTAMP-RANDOM
 */
const generateTransactionId = (prefix = 'REN') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = { generateTransactionId };
