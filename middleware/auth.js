const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { logger, auditLog } = require('../config/logger');
const tokenBlacklist = require('../services/tokenBlacklist.service');

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Support token from Authorization header or query param (for download links)
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Check if token has been revoked/blacklisted
    if (tokenBlacklist && typeof tokenBlacklist.has === 'function') {
      const blacklisted = await tokenBlacklist.has(token);
      if (blacklisted) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    }

    // Verify token
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_secret_change_me');
    if (!secret) {
      return res.status(500).json({
        error: 'Server configuration error: JWT secret not set.',
        code: 'MISSING_JWT_SECRET'
      });
    }
    const decoded = jwt.verify(token, secret);

    // Support tokens that use `userId`, `id` or `sub` in payload
    const userId = decoded.userId || decoded.id || decoded.sub;
    // Find user and check if still active
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.',
        retryAfter: new Date(user.lockoutUntil).toISOString()
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    // Normalize JWT related errors to a single response for clients
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Middleware to check user roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.email} with role ${req.user.role}`);
      
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = authorize('admin');

/**
 * Middleware to check if user is regular user or admin
 */
const requireUser = authorize('user', 'admin');

/**
 * Middleware to verify email verification status
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Email verification required.',
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before accessing this resource.'
    });
  }
  next();
};

/**
 * Middleware to log user activity
 */
const logActivity = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the activity
      auditLog.profileUpdate(
        req.user?.id,
        req.user?.email,
        { action, timestamp: new Date().toISOString() },
        req.ip
      );
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to check rate limiting for sensitive operations
 */
const checkRateLimit = (req, res, next) => {
  // This would integrate with a rate limiting service like Redis
  // For now, we'll use a simple in-memory approach

  // In a production environment, you'd use Redis or similar
  // For now, we'll just pass through
  next();
};

/**
 * Middleware to validate JWT token format
 */
const validateTokenFormat = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    // Normalize missing auth header message to match authenticate() for tests
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireUser,
  requireEmailVerification,
  logActivity,
  checkRateLimit,
  validateTokenFormat
};
