const { generateTransactionId } = require('../../utils/transactionId');

describe('transactionId', () => {
  test('generates with default prefix REN', () => {
    const id = generateTransactionId();
    expect(id.startsWith('REN-')).toBe(true);
    const parts = id.split('-');
    expect(parts.length).toBe(3);
    expect(Number.isNaN(Number(parts[1]))).toBe(false);
    expect(parts[2]).toHaveLength(8);
  });

  test('supports custom prefix', () => {
    const id = generateTransactionId('PAY');
    expect(id.startsWith('PAY-')).toBe(true);
  });
});
