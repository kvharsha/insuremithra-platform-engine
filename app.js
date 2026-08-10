const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { logger } = require('./config/logger');
const { timingMiddleware, getPerformanceStats, getSlowRequests } = require('./middleware/timing.middleware');
const cache = require('./services/cache.service');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const policyRoutes = require('./routes/policy.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const renewalRoutes = require('./routes/renewal.routes');
const claimRoutes = require('./routes/claim.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Enable gzip compression
const enableCompression = process.env.ENABLE_COMPRESSION !== 'false'; // Default to true
if (enableCompression) {
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balance between speed and compression ratio
    threshold: 1024 // Only compress responses larger than 1KB
  }));
  logger.info('✅ Gzip compression enabled');
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting for authentication endpoints (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to auth routes only in production
  app.use('/api/auth', authLimiter);
} else {
  // Development: More lenient rate limiting
  const devAuthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute in development
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth', devAuthLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance timing middleware
app.use(timingMiddleware);

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static assets caching headers
app.use((req, res, next) => {
  // Set Vary header for compressed responses
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Cache static assets based on file type
  const staticFileExtensions = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i;
  
  if (staticFileExtensions.test(req.path)) {
    // Check if filename contains hash (e.g., main.abc123.js)
    const hasHash = /\.[a-f0-9]{8,}\./i.test(req.path);
    
    if (hasHash) {
      // Immutable hashed assets - cache for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Non-hashed assets - cache for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  } else if (req.path === '/' || req.path.endsWith('.html')) {
    // HTML files - short cache with revalidation
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'InsureMithra API',
    version: '1.0.0'
  });
});

// Performance metrics endpoint
app.get('/api/health/perf', (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 5;
    const stats = getPerformanceStats(minutes);
    const slowRequests = getSlowRequests(2000, 10);
    const cacheStats = cache.getStats();
    
    res.status(200).json({
      success: true,
      performance: stats,
      slowRequests,
      cache: cacheStats
    });
  } catch (error) {
    logger.error('Error fetching performance stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching performance stats' });
  }
});

// In test environment we allow tests to register routes after requiring `app`.
// Do not register a global 404 handler in test mode so tests can add test-only routes.
if (process.env.NODE_ENV !== 'test') {
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });

  // Global error handler
  app.use((error, req, res, _next) => {
    logger.error('Unhandled error:', error);
    
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
} else {
  // In test environment still expose a simple error handler so errors surface in tests
  app.use((err, req, res, next) => {
    // If headers already sent, delegate to default
    if (res.headersSent) return next(err);
    logger.error('Test error handler:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });
}

module.exports = app;
