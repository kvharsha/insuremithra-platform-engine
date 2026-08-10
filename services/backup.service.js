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

async function ensureDirs() {
  await fs.ensureDir(BACKUPS_DIR);
  await fs.ensureDir(LOGS_DIR);
  if (!fs.existsSync(BACKUP_LOG)) await fs.writeFile(BACKUP_LOG, '');
}

function logEntry(line) {
  const ts = dayjs().format('YYYY-MM-DD HH:mm');
  const entry = `[${ts}] ${line}\n`;
  fs.appendFile(BACKUP_LOG, entry).catch(err => logger.error('Failed to append backup log', err));
}

function humanSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0;
  let b = bytes;
  while (b >= 1024 && i < units.length -1) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${units[i]}`;
}

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { shell: false, ...opts });
    let out = '';
    let err = '';
    ps.stdout.on('data', d => out += d.toString());
    ps.stderr.on('data', d => err += d.toString());
    ps.on('error', e => {
      // Spawn-level errors (ENOENT etc.) should be rejected so caller can handle fallback
      reject(e);
    });
    ps.on('close', code => {
      if (code === 0) return resolve({ code, out, err });
      const e = new Error(`Command failed: ${cmd} ${args.join(' ')}\nExit ${code}\n${err}`);
      e.code = code; e.stdout = out; e.stderr = err;
      reject(e);
    });
  });
}

async function nodeBackupFallback(dbOut) {
  // Dump collections to JSON using the current mongoose connection
  const db = mongoose.connection.db;
  const dbName = mongoose.connection.name || (process.env.DB_NAME || 'insuremithra');
  const target = path.join(dbOut, dbName);
  await fs.ensureDir(target);
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const name = c.name;
    const col = db.collection(name);
    const docs = await col.find({}).toArray();
    // store as JSON array
    const outFile = path.join(target, `${name}.json`);
    await fs.writeJson(outFile, docs, { spaces: 2 });
  }
  logger.info('Performed Node fallback DB dump (JSON)');
  logEntry('Performed Node fallback DB dump (JSON)');
}

async function listBackups() {
  try {
    logger.info('[BACKUPS] Listing backups from ' + BACKUPS_DIR);
    await ensureDirs();
    const files = await fs.readdir(BACKUPS_DIR);
    const list = [];
    for (const f of files) {
      const full = path.join(BACKUPS_DIR, f);
      const stat = await fs.stat(full);
      if (stat.isFile() && (f.endsWith('.tar.gz') || f.endsWith('.tgz'))) {
        list.push({ name: f, path: full, sizeBytes: stat.size, sizeHuman: humanSize(stat.size), mtime: stat.mtime });
      }
    }
    // sort newest first
    list.sort((a,b) => b.mtime - a.mtime);
    logger.info(`[BACKUPS] Found ${list.length} backup(s)`);
    return list;
  } catch (error) {
    logger.error('[BACKUPS] Error listing backups:', error);
    throw error;
  }
}

async function cleanupOldBackups(keep = 3) {
  const list = await listBackups();
  if (list.length <= keep) return { removed: 0 };
  const toRemove = list.slice(keep);
  for (const item of toRemove) {
    try { await fs.remove(item.path); logEntry(`Old backup removed: ${item.name}`); } catch (e) { logger.warn('Failed to remove old backup', item.path, e); }
  }
  return { removed: toRemove.length };
}

async function runBackupJob() {
  await ensureDirs();
  const ts = dayjs().format('YYYYMMDD-HHmm');
  const dbFolderName = `db-${ts}`;
  const uploadsFolderName = `uploads-${ts}`;
  const dbOut = path.join(BACKUPS_DIR, dbFolderName);
  const uploadsOut = path.join(BACKUPS_DIR, uploadsFolderName);
  
  logger.info(`[BACKUP] Starting backup job: ${dbFolderName}`);
  logEntry(`Backup started: ${dbFolderName}`);
  
  try {
    await fs.ensureDir(dbOut);

    // mongodump (preferred) - fall back to Node-based dump if binary missing
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGO_URI or MONGODB_URI not set');
    try {
      await runCommand('mongodump', ['--uri', mongoUri, '--out', dbOut]);
    } catch (err) {
      // If spawn couldn't find the binary, perform a Node fallback dump
      logger.warn('mongodump failed or not found, falling back to Node dump', err && err.message ? err.message : err);
      logEntry('mongodump failed or not found; using Node fallback');
      await nodeBackupFallback(dbOut);
    }

    // copy uploads
    const uploadsSrc = path.join(process.cwd(), 'uploads');
    if (await fs.pathExists(uploadsSrc)) {
      await fs.copy(uploadsSrc, uploadsOut);
    } else {
      logger.info('No uploads folder found; skipping file backup');
    }

    // compress both folders into one archive
    const archiveName = `${dbFolderName}.tar.gz`;
    const archivePath = path.join(BACKUPS_DIR, archiveName);
    const itemsToPack = [];
    if (await fs.pathExists(dbOut)) itemsToPack.push(dbFolderName);
    if (await fs.pathExists(uploadsOut)) itemsToPack.push(uploadsFolderName);
    if (itemsToPack.length === 0) throw new Error('Nothing to archive for backup');

    await tar.c({ gzip: true, file: archivePath, cwd: BACKUPS_DIR }, itemsToPack);

    // cleanup uncompressed folders
    await fs.remove(dbOut);
    await fs.remove(uploadsOut);

    const stat = await fs.stat(archivePath);
    const size = stat.size;
    logger.info(`[BACKUP] ✅ Backup created: ${archiveName} (size: ${humanSize(size)})`);
    logEntry(`Backup created: ${archiveName} (size: ${humanSize(size)})`);

    // enforce retention
    const retention = await cleanupOldBackups(3);
    if (retention.removed) {
      logger.info(`[BACKUP] Retention cleanup removed ${retention.removed} old backups`);
      logEntry(`Retention cleanup removed ${retention.removed} old backups`);
    }

    return { name: archiveName, path: archivePath, sizeBytes: size };
  } catch (error) {
    logger.error('[BACKUP] ❌ Backup job failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    logEntry(`Backup failed: ${error.message}`);
    throw error;
  }
}

module.exports = { runBackupJob, listBackups, cleanupOldBackups };
