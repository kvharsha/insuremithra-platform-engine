const express = require('express');
const router = express.Router();
const { initiatePurchase, completePurchase, getPurchase, downloadPDF, getUserPurchases, createTestPurchase } = require('../controllers/purchase.controller');
const { authenticate, validateTokenFormat } = require('../middleware/auth');
const { cacheUserPurchases } = require('../middleware/cache.middleware');

// All purchase endpoints require valid token
router.use(validateTokenFormat);
router.use(authenticate);

router.post('/initiate', initiatePurchase);
router.post('/complete', completePurchase);
router.post('/create-test-purchase', createTestPurchase); // Test endpoint for renewal testing
router.get('/my', cacheUserPurchases, getUserPurchases); // Get user's purchases - cached (30s TTL)
router.get('/:id', getPurchase);
router.get('/:id/download', downloadPDF);

module.exports = router;
