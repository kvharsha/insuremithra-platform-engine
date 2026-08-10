const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const dayjs = require('dayjs');
const mongoose = require('mongoose');
// we'll use spawn directly where needed
const { listBackups } = require('../services/backup.service');
const { logger } = require('../config/logger');

async function run() {
  const backups = await listBackups();
  const toCheck = backups.slice(0, 3);
  if (toCheck.length === 0) {
    console.log('No backups found to verify');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGO_URI or MONGODB_URI must be set');
    process.exit(1);
  }

  for (const b of toCheck) {
    console.log(`Verifying backup ${b.name}`);
    const tmp = path.join(path.dirname(b.path), `verify-tmp-${dayjs().format('YYYYMMDD-HHmmss')}`);
    await fs.ensureDir(tmp);
    try {
      await tar.x({ file: b.path, cwd: tmp });

      // find db folder inside tmp
      const entries = await fs.readdir(tmp);
      const dbFolder = entries.find(n => n.startsWith('db-'));
      if (!dbFolder) throw new Error('No db folder inside archive');
      const dbFolderPath = path.join(tmp, dbFolder);

      // find actual DB name folder inside the dump
      const inner = await fs.readdir(dbFolderPath);
      const dbName = inner.find(n => n && n !== '.' && n !== '..');
      if (!dbName) throw new Error('Unable to detect DB name in dump');

      const tempDbName = 'insuremithra_restore_test';
      // build temp URI by replacing or appending DB name
      const tempUri = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^/]+)\/?.*/, `$1/${tempDbName}`);

      // run mongorestore into temp DB using nsFrom/nsTo mapping
      const dbPathToRestore = path.join(dbFolderPath, dbName);
      // Use mongorestore with --nsFrom/--nsTo to map original DB to temp DB
      const nsFrom = `${dbName}.*`;
      const nsTo = `${tempDbName}.*`;
      await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const args = ['--uri', tempUri, '--drop', '--nsFrom', nsFrom, '--nsTo', nsTo, dbPathToRestore];
        const ps = spawn('mongorestore', args, { shell: false });
        ps.stdout.on('data', d => process.stdout.write(d.toString()));
        ps.stderr.on('data', d => process.stderr.write(d.toString()));
        ps.on('error', (e) => reject(e));
        ps.on('close', code => code === 0 ? resolve() : reject(new Error('mongorestore exit ' + code)));
      });

      // connect via mongoose to temp DB and perform checks
      await mongoose.connect(tempUri, { useNewUrlParser: true, useUnifiedTopology: true });
      // require models after connecting so they attach to the current mongoose connection
      const User = require('../models/user.model');
      const Policy = require('../models/policy.model');
      const Purchase = require('../models/purchase.model');

      const [userCount, policyCount, purchaseCount] = await Promise.all([
        User.countDocuments(),
        Policy.countDocuments(),
        Purchase.countDocuments()
      ]);

      console.log(`Counts in restored DB: users=${userCount}, policies=${policyCount}, purchases=${purchaseCount}`);
      if (userCount <= 0 || policyCount <= 0 || purchaseCount <= 0) {
        throw new Error('Sanity checks failed: one or more required collections are empty');
      }

      // drop temp DB
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();

      console.log(`Backup ${b.name} verified successfully`);
    } catch (err) {
      console.error(`Verification failed for ${b.name}:`, err.message || err);
      logger.error('Verification failed for backup', b.name, err);
      try { 
        await fs.remove(tmp); 
      } catch (_e) {
        // ignore cleanup errors
      }
      process.exitCode = 2;
    } finally {
      try { 
        await fs.remove(tmp); 
      } catch (_e) { 
        // ignore cleanup errors 
      }
    }
  }

  console.log('Verification completed');
}

run().catch(err => { console.error(err); process.exit(1); });
