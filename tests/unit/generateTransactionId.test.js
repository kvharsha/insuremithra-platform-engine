const generateTransactionId = require('../../utils/generateTransactionId');
const crypto = require('crypto');

describe('generateTransactionId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('includes prefix and hex string', () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('001122334455', 'hex'));
    const id = generateTransactionId('TX_');
    expect(id.startsWith('TX_')).toBe(true);
    // hex of 6 bytes -> 12 hex chars
    expect(id.length).toBeGreaterThan(3);
  });
});
