const express = require('express');
const router = express.Router();
const { submitClaim, getUserClaims, getClaimById, getClaimByIdDocument, updateClaimStatus, getAllClaimsAdmin } = require('../controllers/claim.controller');
const { authenticate, validateTokenFormat } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const { cacheUserClaims } = require('../middleware/cache.middleware');
const upload = require('../middleware/upload');

// All claim endpoints require authentication
router.use(validateTokenFormat);
router.use(authenticate);

// POST /api/claims - Submit a new claim with documents
// Expects multipart/form-data with fields: policyId, reason, and files (documents)
router.post('/', upload.array('documents', 5), submitClaim);

// GET /api/claims/my - Get all claims for authenticated user (alias) - cached (30s TTL)
router.get('/my', cacheUserClaims, getUserClaims);
// GET /api/claims - keep existing route for backward compatibility - cached (30s TTL)
router.get('/', cacheUserClaims, getUserClaims);

// Admin: list all claims
router.get('/admin', authorizeRoles('admin'), getAllClaimsAdmin);

// GET /api/claims/:id - Get specific claim details (by claimId)
router.get('/:claimId', getClaimById);
router.get('/:id', getClaimById);

// GET /api/claims/:claimId/documents/:filename - download a claim document
router.get('/:claimId/documents/:filename', getClaimByIdDocument);

// PUT /api/claims/:id/status - Admin-only: update claim status
router.put('/:id/status', authorizeRoles('admin'), updateClaimStatus);

module.exports = router;
