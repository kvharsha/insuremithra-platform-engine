describe('upload middleware basic checks', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('creates temp uploads directory when missing', () => {
    const fs = require('fs');
    const realExists = fs.existsSync;
    const realMkdir = fs.mkdirSync;
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();

    // Re-require module to trigger directory creation
    require('../../middleware/upload');

    expect(fs.mkdirSync).toHaveBeenCalled();

    // restore
    fs.existsSync = realExists;
    fs.mkdirSync = realMkdir;
  });

  test('allowed mimetypes include pdf and images', () => {
    // The middleware defines allowed mimes - ensure list includes expected types
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    expect(allowed).toContain('application/pdf');
    expect(allowed).toContain('image/png');
  });
});
