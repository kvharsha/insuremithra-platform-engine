const crypto = require('crypto');

/**
 * Generates a unique claim ID in format: CLM-YYYYMMDD-XXXX
 * where XXXX is a random 4-character alphanumeric string
 * 
 * @returns {string} Generated claim ID
 */
function generateClaimId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate 4-character random alphanumeric string
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `CLM-${year}${month}${day}-${randomPart}`;
}

module.exports = generateClaimId;
