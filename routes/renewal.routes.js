const express = require('express');
const {
  checkEligibility,
  initiateRenewal,
  getRenewalStatus,
  getMyRenewals
} = require('../controllers/renewal.controller');
const { authenticate, validateTokenFormat } = require('../middleware/auth');

const router = express.Router();

// All renewal routes require authentication
router.use(validateTokenFormat);
router.use(authenticate);

// Check renewal eligibility for a purchase
router.get('/eligibility/:purchaseId', checkEligibility);

// Initiate renewal process
router.post('/initiate', initiateRenewal);

// Get user's renewal history (must come before /:renewalId to avoid conflict)
router.get('/my', getMyRenewals);

// Get renewal status
router.get('/:renewalId', getRenewalStatus);

module.exports = router;
