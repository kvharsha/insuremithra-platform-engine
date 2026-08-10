const generateClaimId = require('../../utils/claimIdGenerator');
const crypto = require('crypto');

describe('generateClaimId', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2025-11-12T00:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns expected format CLM-YYYYMMDD-XXXX', () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('abcd', 'hex'));
    const id = generateClaimId();
    expect(id).toMatch(/^CLM-\d{8}-[0-9A-F]{4}$/);
  });
});
