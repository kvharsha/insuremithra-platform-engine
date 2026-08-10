jest.resetModules();
const fs = require('fs');
const EventEmitter = require('events');

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    return {
      pipe: jest.fn(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
  });
});

describe('generatePolicyPDF', () => {
  let origExists, origMkdir, origCreateWrite;
  beforeEach(() => {
    origExists = fs.existsSync;
    origMkdir = fs.mkdirSync;
    origCreateWrite = fs.createWriteStream;
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.createWriteStream = jest.fn(() => {
      const ev = new EventEmitter();
      // simulate async finish
      process.nextTick(() => ev.emit('finish'));
      ev.on = ev.addListener;
      ev.pipe = () => {};
      return ev;
    });
  });
  afterEach(() => {
    fs.existsSync = origExists;
    fs.mkdirSync = origMkdir;
    fs.createWriteStream = origCreateWrite;
    jest.resetModules();
  });

  test('resolves with a file path when PDF generation finishes', async () => {
    const generatePolicyPDF = require('../../utils/generatePolicyPDF');
    const purchase = { _id: 'P1', transactionId: 'T1', createdAt: new Date() };
    const user = { firstName: 'A', lastName: 'B', email: 'a@b' };
    const policy = { name: 'X', type: 'Y', model: 'M', insurer: 'I', premium: 100, coverage: 'C', tenure: '1y' };
    const path = await generatePolicyPDF({ purchase, user, policy });
    expect(path).toBeDefined();
    expect(fs.createWriteStream).toHaveBeenCalled();
  });
});
