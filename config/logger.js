const winston = require('winston');
const path = require('path');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'insuremithra-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Audit logging for security events
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Helper functions for audit logging
const auditLog = {
  userLogin: (userId, email, ip, userAgent) => {
    auditLogger.info('User login', {
      event: 'USER_LOGIN',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },

  userLogout: (userId, email, ip) => {
    auditLogger.info('User logout', {
      event: 'USER_LOGOUT',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  passwordReset: (userId, email, ip) => {
    auditLogger.info('Password reset initiated', {
      event: 'PASSWORD_RESET',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  profileUpdate: (userId, email, changes, ip) => {
    auditLogger.info('Profile updated', {
      event: 'PROFILE_UPDATE',
      userId,
      email,
      changes,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  accessAttempt: (userId, email, url, method, granted, ip, reason) => {
    auditLogger.info('Access attempt', {
      event: 'ACCESS_ATTEMPT',
      userId: userId || null,
      email: email || null,
      url: url || null,
      method: method || null,
      granted: !!granted,
      reason: reason || null,
      ip: ip || null,
      timestamp: new Date().toISOString()
    });
  },

  failedLogin: (email, ip, reason) => {
    auditLogger.warn('Failed login attempt', {
      event: 'FAILED_LOGIN',
      email,
      ip,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  accountLockout: (email, ip) => {
    auditLogger.warn('Account locked due to failed attempts', {
      event: 'ACCOUNT_LOCKOUT',
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { logger, auditLog };
