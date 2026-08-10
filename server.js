require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { logger } = require('./config/logger');

const PORT = process.env.PORT || 5001;

// Database connection
// Prefer MONGO_URI but fall back to MONGODB_URI for compatibility
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra';

async function startServer() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to MongoDB successfully');
    // Start backup scheduler after DB connection
    try {
      // require here so file exists after we add scheduler
      const { startBackupScheduler } = require('./scheduler/backupScheduler');
      if (typeof startBackupScheduler === 'function') startBackupScheduler();
      logger.info('Backup scheduler started');
    } catch (err) {
      logger.warn('Backup scheduler not started:', err && err.message ? err.message : err);
    }

    // Start server only when running directly
    if (require.main === module) {
      app.listen(PORT, () => {
        logger.info(`InsureMithra API server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // In direct run, exit; when required by tests, rethrow
    if (require.main === module) process.exit(1);
    throw error;
  }
}

// Start immediately when running this file directly
startServer().catch(() => {});

// Export the app for tests and other consumers
module.exports = app;
