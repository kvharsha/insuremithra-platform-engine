const { calculateNewExpiry, calculateDaysUntilExpiry, isEligibleForRenewal } = require('../../utils/renewalCalculator');

describe('renewalCalculator', () => {
  test('calculateNewExpiry defaults to +1 year on invalid tenure', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const next = calculateNewExpiry(now, 'invalid');
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(0);
    expect(next.getUTCDate()).toBe(1);
  });

  test('calculateNewExpiry supports months and days', () => {
    const base = new Date('2025-01-15T00:00:00Z');
    const plusMonths = calculateNewExpiry(base, '2 months');
    expect(plusMonths.getUTCMonth()).toBe(2); // March (0-based)

    const plusDays = calculateNewExpiry(base, '10 days');
    expect(plusDays.getUTCDate()).toBe(25);
  });

  test('calculateDaysUntilExpiry returns positive, zero, negative correctly', () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const inPast = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(calculateDaysUntilExpiry(inTwoDays)).toBeGreaterThan(0);
    expect(calculateDaysUntilExpiry(inPast)).toBeLessThan(0);
  });

  test('isEligibleForRenewal respects window', () => {
    const fiveDaysOut = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const tenDaysOut = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isEligibleForRenewal(fiveDaysOut, 7)).toBe(true);
    expect(isEligibleForRenewal(tenDaysOut, 7)).toBe(false);
    expect(isEligibleForRenewal(yesterday, 7)).toBe(false);
  });
});
