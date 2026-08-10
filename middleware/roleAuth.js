const { auditLog, logger } = require('../config/logger');
const { authenticate } = require('./auth');

/**
 * authorizeRoles middleware
 * Usage: authorizeRoles('admin', 'superadmin')
 * This middleware assumes `authenticate` has run and `req.user` is present.
 * If used directly on routes, it will run `authenticate` first.
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Ensure authentication has been performed. If not, run authenticate.
      if (!req.user) {
        // run authenticate middleware inline
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      const user = req.user;

      if (!user || !allowedRoles.includes(user.role)) {
        // Log denied attempt for audit
        auditLog.accessAttempt(user ? user.id : null, user ? user.email : null, req.originalUrl, req.method, false, req.ip, 'Insufficient role');
        logger.warn(`Access denied for ${user ? user.email : 'unknown user'} to ${req.originalUrl} - required roles: ${allowedRoles.join(', ')}`);

        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Log granted access
      auditLog.accessAttempt(user.id, user.email, req.originalUrl, req.method, true, req.ip, 'Access granted');

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      // If authenticate already sent a response (like 401), bail out
      if (res.headersSent) return;
      res.status(500).json({ success: false, message: 'Authorization failed' });
    }
  };
};

const requireAdmin = authorizeRoles('admin');

module.exports = { authorizeRoles, requireAdmin };
