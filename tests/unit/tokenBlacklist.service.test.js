const tokenBlacklist = require('../../services/tokenBlacklist.service');

describe('tokenBlacklist.service (in-memory fallback)', () => {
  beforeEach(async () => {
    await tokenBlacklist.clearAll();
  });

  test('add() then has() returns true before expiry', async () => {
    await tokenBlacklist.add('t1', 1); // 1 second
    expect(await tokenBlacklist.has('t1')).toBe(true);
  });

  test('has() returns false after expiry', async () => {
    jest.useFakeTimers();
    await tokenBlacklist.add('t2', 1);
    expect(await tokenBlacklist.has('t2')).toBe(true);

    // Advance past TTL + small buffer
    jest.advanceTimersByTime(1500);

    // Force any pending timers to run
    await Promise.resolve();

    expect(await tokenBlacklist.has('t2')).toBe(false);
    jest.useRealTimers();
  });

  test('clearAll() empties the store', async () => {
    await tokenBlacklist.add('t3', 60);
    expect(await tokenBlacklist.has('t3')).toBe(true);
    await tokenBlacklist.clearAll();
    expect(await tokenBlacklist.has('t3')).toBe(false);
  });
});
