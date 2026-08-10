const cron = require('node-cron');
const { runBackupJob } = require('../services/backup.service');
const { logger } = require('../config/logger');

let task = null;

function startBackupScheduler() {
  // Allow disabling scheduler via env var
  if (process.env.DISABLE_BACKUP_SCHEDULER === 'true') {
    logger.info('Backup scheduler disabled via DISABLE_BACKUP_SCHEDULER');
    return;
  }

  // schedule daily at midnight server time
  task = cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Scheduled backup job starting');
      await runBackupJob();
      logger.info('Scheduled backup job completed');
    } catch (err) {
      logger.error('Scheduled backup job failed', err);
    }
  }, { scheduled: true, timezone: process.env.SERVER_TIMEZONE || undefined });

  logger.info('Backup scheduler initialized (daily at 00:00)');
}

function stopBackupScheduler() {
  if (task) task.stop();
}

module.exports = { startBackupScheduler, stopBackupScheduler };
