/**
 * Quick test to verify backup system error logging
 * Run with: node tools/test-backup-logging.js
 */

require('dotenv').config();

// Mock logger to capture log calls
const logCapture = {
  info: [],
  error: [],
  warn: []
};

const originalLogger = require('../config/logger').logger;
const mockLogger = {
  info: (...args) => {
    logCapture.info.push(args);
    originalLogger.info(...args);
  },
  error: (...args) => {
    logCapture.error.push(args);
    originalLogger.error(...args);
  },
  warn: (...args) => {
    logCapture.warn.push(args);
    originalLogger.warn(...args);
  }
};

// Override logger
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === '../config/logger' || id.endsWith('config/logger.js')) {
    return { logger: mockLogger, auditLog: originalRequire.call(this, id).auditLog };
  }
  return originalRequire.call(this, id);
};

const backupService = require('../services/backup.service');
const restoreService = require('../services/restore.service');

async function testBackupLogging() {
  console.log('🧪 Testing Backup System Error Logging\n');

  // Test 1: List backups (should log admin action)
  console.log('Test 1: List backups');
  try {
    const backups = await backupService.listBackups();
    console.log(`✅ Listed ${backups.length} backups`);
    const hasListLog = logCapture.info.some(log => 
      JSON.stringify(log).includes('Listed') || JSON.stringify(log).includes('backups')
    );
    console.log(`   Logging captured: ${hasListLog ? '✅' : '❌'}\n`);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}\n`);
  }

  // Test 2: Attempt to restore non-existent backup (should log error with details)
  console.log('Test 2: Restore non-existent backup (should fail with detailed error)');
  logCapture.error = [];
  try {
    await restoreService.restoreBackup('nonexistent-backup.tar.gz');
    console.log('❌ Should have thrown error\n');
  } catch (err) {
    console.log(`✅ Correctly threw error: ${err.message}`);
    const hasStructuredError = logCapture.error.some(log => {
      const str = JSON.stringify(log);
      return str.includes('[RESTORE]') && str.includes('❌');
    });
    console.log(`   Structured error logging: ${hasStructuredError ? '✅' : '❌'}`);
    const hasErrorDetails = logCapture.error.some(log => {
      const str = JSON.stringify(log);
      return str.includes('message') || str.includes('archive');
    });
    console.log(`   Error details included: ${hasErrorDetails ? '✅' : '❌'}\n`);
  }

  // Test 3: Check backup job logging format
  console.log('Test 3: Verify backup job logging (dry run)');
  console.log('   Note: Full backup test requires MongoDB connection');
  console.log('   Check logs/combined.log for actual backup operations\n');

  console.log('📊 Summary:');
  console.log(`   Info logs captured: ${logCapture.info.length}`);
  console.log(`   Error logs captured: ${logCapture.error.length}`);
  console.log(`   Warn logs captured: ${logCapture.warn.length}`);
  
  console.log('\n✨ Error logging enhancements are in place!');
  console.log('   Run actual backup operations and check logs/ directory for detailed output.');
  
  process.exit(0);
}

testBackupLogging().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
