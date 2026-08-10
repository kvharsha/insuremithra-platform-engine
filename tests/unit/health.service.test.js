const axios = require('axios');
const { checkService, checkMultipleServices, validateServiceUrl } = require('../../services/health.service');

jest.mock('axios');

describe('health.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateServiceUrl', () => {
    it('accepts valid http/https URLs', () => {
      expect(validateServiceUrl('http://example.com').valid).toBe(true);
      expect(validateServiceUrl('https://example.com/health').valid).toBe(true);
    });

    it('rejects invalid URL format', () => {
      const res = validateServiceUrl('not-a-url');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid URL format');
    });

    it('rejects unsupported protocol', () => {
      const res = validateServiceUrl('ftp://example.com');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Only HTTP and HTTPS protocols are supported');
    });
  });

  describe('checkService', () => {
    it('returns ok=true on 200', async () => {
      axios.get.mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });
      const result = await checkService('https://svc/health', 1000);
      expect(result.ok).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseData).toEqual({ status: 'ok' });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns ok=false on non-2xx', async () => {
      axios.get.mockResolvedValueOnce({ status: 503, data: { status: 'down' } });
      const result = await checkService('https://svc/health', 1000);
      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(503);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('handles timeout error gracefully', async () => {
      const err = new Error('timeout');
      err.code = 'ECONNABORTED';
      axios.get.mockRejectedValueOnce(err);
      const result = await checkService('https://svc/health', 50);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Request timeout');
      expect(result.errorCode).toBe('ECONNABORTED');
    });

    it('handles connection refused', async () => {
      const err = new Error('refused');
      err.code = 'ECONNREFUSED';
      axios.get.mockRejectedValueOnce(err);
      const result = await checkService('http://localhost:9999/health', 50);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(result.errorCode).toBe('ECONNREFUSED');
    });

    it('handles DNS lookup failure', async () => {
      const err = new Error('not found');
      err.code = 'ENOTFOUND';
      axios.get.mockRejectedValueOnce(err);
      const result = await checkService('http://no-such-host.invalid/health', 50);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('DNS lookup failed');
      expect(result.errorCode).toBe('ENOTFOUND');
    });

    it('includes statusCode when error.response is present', async () => {
      const err = new Error('server error');
      err.response = { status: 500 };
      axios.get.mockRejectedValueOnce(err);
      const result = await checkService('https://svc/health', 50);
      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toContain('HTTP 500');
    });
  });

  describe('checkMultipleServices', () => {
    it('runs checks in parallel and returns aggregated results', async () => {
      axios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 503 });

      const urls = ['https://a/health', 'https://b/health'];
      const results = await checkMultipleServices(urls, 1000);
      expect(results).toHaveLength(2);
      expect(results[0].url).toBe(urls[0]);
      expect(results[1].url).toBe(urls[1]);
      expect(results[0].result.ok).toBe(true);
      expect(results[1].result.ok).toBe(false);
    });
  });
});
