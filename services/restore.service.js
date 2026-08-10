const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const tar = require('tar');
const dayjs = require('dayjs');
const { logger } = require('../config/logger');

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const BACKUP_LOG = path.join(LOGS_DIR, 'backup.log');

function logEntry(line) {
  const ts = dayjs().format('YYYY-MM-DD HH:mm');
  const entry = `[${ts}] ${line}\n`;
  fs.appendFile(BACKUP_LOG, entry).catch(err => logger.error('Failed to append backup log', err));
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { shell: false, ...opts });
    let out = '';
    let err = '';
    ps.stdout.on('data', d => out += d.toString());
    ps.stderr.on('data', d => err += d.toString());
    ps.on('error', e => reject(e));
    ps.on('close', code => {
      if (code === 0) return resolve({ code, out, err });
      const e = new Error(`Command failed: ${cmd} ${args.join(' ')}\nExit ${code}\n${err}`);
      e.code = code; e.stdout = out; e.stderr = err;
      reject(e);
    });
  });
}

async function nodeRestoreFallback(dbPath, _mongoUri) {
  // dbPath should contain either a DB-named folder or collection JSON files
  // We'll inspect and insert JSON files into the target DB
  const db = mongoose.connection.db;
  // We'll use the established mongoose connection

  // Walk dbPath to find JSON files
  const entries = await fs.readdir(dbPath);
  // If top-level contains DB name folder, descend
  let targetFolder = dbPath;
  const maybeDb = entries.find(n => n && !n.startsWith('.'));
  if (maybeDb) {
    const candidate = path.join(dbPath, maybeDb);
    if ((await fs.stat(candidate)).isDirectory()) {
      targetFolder = candidate;
    }
  }

  const files = await fs.readdir(targetFolder);
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const collName = path.basename(f, '.json');
    const filePath = path.join(targetFolder, f);
    const docs = await fs.readJson(filePath);
    const collection = db.collection(collName);
    if (Array.isArray(docs) && docs.length) {
      try {
        await collection.deleteMany({});
      } catch (_e) { 
        // ignore deletion errors
      }
      // Insert documents; ensure _id fields remain if present
      await collection.insertMany(docs);
    }
  }
  logger.info('Performed Node fallback restore (JSON files)');
  logEntry('Performed Node fallback restore (JSON files)');
}

async function restoreBackup(backupName) {
  logger.info(`[RESTORE] Starting restore from: ${backupName}`);
  logEntry(`Restore started from ${backupName}`);
  
  await fs.ensureDir(BACKUPS_DIR);
  await fs.ensureDir(LOGS_DIR);
  const archivePath = path.isAbsolute(backupName) ? backupName : path.join(BACKUPS_DIR, backupName);
  
  if (!await fs.pathExists(archivePath)) {
    const error = new Error('Backup archive not found: ' + archivePath);
    logger.error('[RESTORE] ❌ Archive not found:', archivePath);
    logEntry(`Restore failed: archive not found - ${backupName}`);
    throw error;
  }

  const tmpDir = path.join(BACKUPS_DIR, `restore-tmp-${dayjs().format('YYYYMMDD-HHmmss')}`);
  await fs.ensureDir(tmpDir);
  try {
    // extract archive to tmpDir
    await tar.x({ file: archivePath, cwd: tmpDir, strip: 0 });

    // find db folder
    const entries = await fs.readdir(tmpDir);
    const dbFolder = entries.find(n => n.startsWith('db-'));
    const uploadsFolder = entries.find(n => n.startsWith('uploads-'));

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI or MONGODB_URI not set');

    if (dbFolder) {
      const dbPath = path.join(tmpDir, dbFolder);
      // run mongorestore (preferred) - fall back to Node-based restore if binary missing
      try {
        await runCommand('mongorestore', ['--uri', mongoUri, '--drop', dbPath]);
      } catch (err) {
        logger.warn('mongorestore failed or not found, attempting Node fallback', err && err.message ? err.message : err);
        logEntry('mongorestore failed or not found; using Node fallback restore');
        await nodeRestoreFallback(dbPath, mongoUri);
      }
    } else {
      logger.warn('No DB folder found in archive; skipping DB restore');
    }

    if (uploadsFolder) {
      const uploadsSrc = path.join(tmpDir, uploadsFolder);
      const uploadsDest = path.join(process.cwd(), 'uploads');
      await fs.ensureDir(uploadsDest);
      await fs.copy(uploadsSrc, uploadsDest, { overwrite: true });
    } else {
      logger.info('No uploads folder in archive; skipping uploads restore');
    }

    logger.info(`[RESTORE] ✅ Restore completed from ${path.basename(archivePath)}`);
    logEntry(`Restore completed from ${path.basename(archivePath)}`);
    return { restoredFrom: path.basename(archivePath) };
  } catch (error) {
    logger.error('[RESTORE] ❌ Restore failed:', {
      archive: backupName,
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    logEntry(`Restore failed from ${path.basename(archivePath)}: ${error.message}`);
    throw error;
  } finally {
    // cleanup tmpDir
    try { await fs.remove(tmpDir); } catch (e) { logger.warn('Failed to clean restore tmp dir', e); }
  }
}

module.exports = { restoreBackup };
