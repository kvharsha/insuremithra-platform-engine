const storage = require('../../services/storage.service');
const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Provide mock implementations used by the service
    fs.existsSync = jest.fn();
    fs.mkdirSync = jest.fn();
    fs.renameSync = jest.fn();
    fs.rmSync = jest.fn();
    // Fix Date.now for deterministic filenames
    jest.spyOn(Date, 'now').mockReturnValue(1600000000000);
  });

  afterAll(() => {
    Date.now.mockRestore();
  });

  test('sanitizeFilename removes special chars and limits length', () => {
    const input = 'my/evil\\name..txt?<>:"*|';
    const out = storage.sanitizeFilename(input);
    expect(out).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(out.length).toBeLessThanOrEqual(255);
  });

  test('ensureDirectoryExists creates dir when missing', () => {
    fs.existsSync.mockReturnValue(false);
    storage.ensureDirectoryExists('/some/dir');
    expect(fs.existsSync).toHaveBeenCalledWith('/some/dir');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/some/dir', { recursive: true });
  });

  test('storeClaimDocuments moves files and returns metadata', async () => {
    const claimId = 'CLAIM123';
    const tmpPath = path.join(process.cwd(), 'tmp', 'uploadedfile.tmp');
    const files = [{
      path: tmpPath,
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 12345
    }];

    // directory doesn't exist initially
    fs.existsSync.mockReturnValue(false);
    fs.renameSync.mockImplementation(() => {});

    const meta = await storage.storeClaimDocuments(claimId, files);

    expect(fs.renameSync).toHaveBeenCalled();
    expect(meta).toHaveLength(1);
    expect(meta[0]).toMatchObject({
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      size: 12345
    });
    // filename should include the mocked timestamp
    expect(meta[0].filename).toContain('1600000000000-report.pdf');
    // path should include uploads/claims/<claimId>
    expect(meta[0].path).toContain(path.join('uploads', 'claims', claimId));
  });

  test('deleteClaimDocuments removes directory when exists', async () => {
    fs.existsSync.mockReturnValue(true);
    await storage.deleteClaimDocuments('ABC');
    expect(fs.rmSync).toHaveBeenCalled();
  });

  test('getDocumentUrl converts base path to /uploads', () => {
    const p = path.join(process.cwd(), 'uploads', 'claims', 'ABC', 'file.pdf');
    const url = storage.getDocumentUrl(p);
    // Normalize slashes for platform independence
    expect(url.replace(/\\/g, '/')).toContain('/uploads/claims/ABC/file.pdf');
  });
});
