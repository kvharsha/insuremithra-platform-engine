const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Honor CRA proxy headers in development
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 15, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '30 seconds'
  }
});

// Apply rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Database connection
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/insuremithra';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  // Seed sample policies on first run (dev/demo)
  try {
    require('./utils/seed_policies').seedPoliciesIfEmpty(console);
  } catch (e) {
    console.error('Seed failed:', e);
  }
  
  // Start downtime monitor after DB connection
  try {
    const downtimeMonitor = require('./scheduler/downtimeMonitor');
    downtimeMonitor.start();
  } catch (e) {
    console.error('Failed to start downtime monitor:', e);
  }
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const policyRoutes = require('./routes/policy.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const claimRoutes = require('./routes/claim.routes');
const renewalRoutes = require('./routes/renewal.routes');
const adminRoutes = require('./routes/admin.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'InsureMithra API',
    version: '1.0.0',
    message: 'Server is running successfully!'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'InsureMithra API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      profile: '/api/profile/*',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((error, req, res, _next) => {
  console.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 InsureMithra API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`👤 Profile endpoints: http://localhost:${PORT}/api/profile/*`);
  console.log(`📄 Policy endpoints: http://localhost:${PORT}/api/policies/*`);
  console.log(`💳 Purchase endpoints: http://localhost:${PORT}/api/purchase/*`);
  console.log(`🔄 Renewal endpoints: http://localhost:${PORT}/api/renewals/*`);
  console.log(`📋 Claim endpoints: http://localhost:${PORT}/api/claims/*`);
});

module.exports = app;
