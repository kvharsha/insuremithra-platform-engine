const axios = require('axios');
const { formatDuration, sendWebhookAlert } = require('../../services/alert.service');

jest.mock('axios');

describe('alert.service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('formatDuration formats seconds, minutes, hours, days', () => {
    expect(formatDuration(5 * 1000)).toBe('5s');
    expect(formatDuration(2 * 60 * 1000 + 5 * 1000)).toBe('2m 5s');
    expect(formatDuration(3 * 60 * 60 * 1000 + 2 * 60 * 1000)).toBe('3h 2m');
    expect(formatDuration(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 4 * 60 * 1000)).toBe('2d 3h 4m');
  });

  test('sendWebhookAlert posts when ALERT_WEBHOOK_URL set', async () => {
    const original = process.env.ALERT_WEBHOOK_URL;
    process.env.ALERT_WEBHOOK_URL = 'https://example.com/webhook';

    axios.post.mockResolvedValueOnce({ status: 200 });

    await sendWebhookAlert({ event: 'service_down', service: 'http://svc', incidentId: '1' });
    expect(axios.post).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({ event: 'service_down' }),
      expect.objectContaining({ timeout: 5000, headers: expect.any(Object) })
    );

    process.env.ALERT_WEBHOOK_URL = original;
  });

  test('sendWebhookAlert is no-op when webhook unset', async () => {
    const original = process.env.ALERT_WEBHOOK_URL;
    delete process.env.ALERT_WEBHOOK_URL;

    await sendWebhookAlert({ event: 'noop' });
    expect(axios.post).not.toHaveBeenCalled();

    process.env.ALERT_WEBHOOK_URL = original;
  });
});
