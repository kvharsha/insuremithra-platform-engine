/**
 * Calculate new expiry date based on policy tenure
 * @param {Date} currentExpiry - Current expiry date
 * @param {string} tenure - Policy tenure (e.g., "1 year", "6 months", "3 years")
 * @returns {Date} - New expiry date
 */
const calculateNewExpiry = (currentExpiry, tenure = '1 year') => {
  const expiryDate = new Date(currentExpiry);
  
  // Parse tenure string
  const tenureMatch = tenure.match(/(\d+)\s*(year|month|day)s?/i);
  
  if (!tenureMatch) {
    // Default to 1 year if parsing fails
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    return expiryDate;
  }
  
  const value = parseInt(tenureMatch[1]);
  const unit = tenureMatch[2].toLowerCase();
  
  switch (unit) {
    case 'year':
      expiryDate.setFullYear(expiryDate.getFullYear() + value);
      break;
    case 'month':
      expiryDate.setMonth(expiryDate.getMonth() + value);
      break;
    case 'day':
      expiryDate.setDate(expiryDate.getDate() + value);
      break;
    default:
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }
  
  return expiryDate;
};

/**
 * Calculate days until expiry
 * @param {Date} expiryDate - Expiry date
 * @returns {number} - Days until expiry (negative if expired)
 */
const calculateDaysUntilExpiry = (expiryDate) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Check if policy is eligible for renewal
 * @param {Date} expiryDate - Expiry date
 * @param {number} windowDays - Renewal window in days (default 7)
 * @returns {boolean} - True if eligible for renewal
 */
const isEligibleForRenewal = (expiryDate, windowDays = 7) => {
  const daysLeft = calculateDaysUntilExpiry(expiryDate);
  return daysLeft > 0 && daysLeft <= windowDays;
};

module.exports = {
  calculateNewExpiry,
  calculateDaysUntilExpiry,
  isEligibleForRenewal
};
