describe('payment.service sandbox behaviors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, PAYMENT_GATEWAY_MODE: 'sandbox', SANDBOX_MIN_MS: '0', SANDBOX_MAX_MS: '0' };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test('processPayment returns success on high random', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9); // > 0.1 → success
    const svc = require('../../services/payment.service');

    const res = await svc.processPayment({ amount: 100, currency: 'INR', paymentMethod: 'card', transactionId: 'REN-1' });
    expect(res.success).toBe(true);
    expect(res.transactionId).toBe('REN-1');
    expect(res.gatewayTransactionId).toBeDefined();
    expect(res.gatewayReceipt).toBeDefined();
  });

  test('processPayment returns failure on low random', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05); // <= 0.1 → failure
    const svc = require('../../services/payment.service');

    const res = await svc.processPayment({ amount: 100, currency: 'INR', paymentMethod: 'card', transactionId: 'REN-2' });
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('PAYMENT_DECLINED');
  });

  test('verifyPayment returns success in sandbox', async () => {
    const svc = require('../../services/payment.service');
    const res = await svc.verifyPayment('REN-1');
    expect(res.verified).toBe(true);
    expect(res.status).toBe('success');
  });

  test('initiateRefund returns success in sandbox', async () => {
    const svc = require('../../services/payment.service');
    const res = await svc.initiateRefund('REN-1', 50);
    expect(res.success).toBe(true);
    expect(res.refundId).toBe('REF-REN-1');
  });
});

describe('payment.service invalid/live mode behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('processPayment throws in live mode (not implemented)', async () => {
    process.env = { ...originalEnv, PAYMENT_GATEWAY_MODE: 'live' };
    const svc = require('../../services/payment.service');

    await expect(
      svc.processPayment({ amount: 1, currency: 'INR', paymentMethod: 'card', transactionId: 'REN-LIVE' })
    ).rejects.toThrow('Live payment gateway not yet implemented');
  });

  test('verifyPayment throws in non-sandbox', async () => {
    process.env = { ...originalEnv, PAYMENT_GATEWAY_MODE: 'live' };
    const svc = require('../../services/payment.service');
    await expect(svc.verifyPayment('REN-LIVE')).rejects.toThrow('Live payment verification not yet implemented');
  });
});
