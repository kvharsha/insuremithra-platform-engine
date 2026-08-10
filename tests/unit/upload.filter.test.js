describe('upload fileFilter via multer options capture', () => {
  beforeEach(() => jest.resetModules());

  test('fileFilter rejects invalid mimetype and accepts valid', () => {
    // ensure any previously-loaded multer or upload modules are removed so our mock takes effect
  try { delete require.cache[require.resolve('multer')]; } catch { /* ignore */ }
  try { delete require.cache[require.resolve('../../middleware/upload')]; } catch { /* ignore */ }

    // mock multer to capture options and provide diskStorage
    const mockDiskStorage = jest.fn((cfg) => ({ _diskCfg: cfg }));
    const mockMulter = jest.fn((opts) => ({ _opts: opts }));
    mockMulter.diskStorage = mockDiskStorage;
    jest.doMock('multer', () => mockMulter);

    const upload = require('../../middleware/upload');
    // upload is the mock return
    const opts = upload._opts;
    expect(opts).toBeDefined();
    const fileFilter = opts.fileFilter;
    expect(typeof fileFilter).toBe('function');

    // valid mimetype
    const cbValid = jest.fn();
    fileFilter({}, { mimetype: 'application/pdf' }, cbValid);
    expect(cbValid).toHaveBeenCalledWith(null, true);

    // invalid mimetype
    const cbInvalid = jest.fn();
    fileFilter({}, { mimetype: 'application/zip' }, cbInvalid);
    expect(cbInvalid.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cbInvalid.mock.calls[0][1]).toBe(false);
  });
});

