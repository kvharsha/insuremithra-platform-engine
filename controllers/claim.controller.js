const Claim = require('../models/claim.model');
const Purchase = require('../models/purchase.model');
const User = require('../models/user.model');
const generateClaimId = require('../utils/claimIdGenerator');
const storageService = require('../services/storage.service');
const { logger } = require('../config/logger');
const { invalidateUserCache } = require('../middleware/cache.middleware');
const fs = require('fs');
const path = require('path');
const { sendClaimStatusEmail } = require('../utils/claimStatusNotifier');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const claimsLogPath = path.join(logsDir, 'claims.log');

/**
 * Log claim submission to claims.log
 */
function logClaimSubmission(userId, claimId, policyId, ipAddress) {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    userId: userId.toString(),
    claimId,
    policyId: policyId.toString(),
    ip: ipAddress,
    action: 'CLAIM_SUBMITTED'
  }) + '\n';

  fs.appendFileSync(claimsLogPath, logEntry, 'utf8');
}

/**
 * Log status changes to claims.log
 */
function logStatusChange(claimId, newStatus, updatedBy) {
  const entry = `[${new Date().toISOString()}] claimId=${claimId}, status=${newStatus}, updatedBy=${updatedBy}\n`;
  try {
    fs.appendFileSync(claimsLogPath, entry, 'utf8');
  } catch (err) {
    logger.error('Failed to write status change to claims.log', err);
  }
}

/**
 * POST /api/claims
 * Submit a new insurance claim with documents
 */
const submitClaim = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { policyId, reason } = req.body;
    const files = req.files;

    // Validation
    if (!policyId) {
      return res.status(400).json({ success: false, message: 'policyId is required' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'reason is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document is required' });
    }

    // Verify policy ownership - check if user has purchased this policy
    const purchase = await Purchase.findOne({ userId, policyId, status: 'success' });
    if (!purchase) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only submit claims for policies you have purchased' 
      });
    }

    // Generate unique claim ID
    const claimId = generateClaimId();

    // Store documents
    let documentMetadata;
    try {
      documentMetadata = await storageService.storeClaimDocuments(claimId, files);
    } catch (storageError) {
      logger.error('Error storing claim documents:', storageError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to store claim documents', 
        error: storageError.message 
      });
    }

    // Create claim record
    const claim = new Claim({
      claimId,
      userId,
      policyId,
      reason: reason.trim(),
      documents: documentMetadata,
      status: 'Submitted',
      audit: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        submissionLocation: req.get('x-forwarded-for') || req.connection.remoteAddress
      }
    });

    await claim.save();

    // Log the submission
    logClaimSubmission(userId, claimId, policyId, claim.audit.ipAddress);

    // Invalidate user's claims cache after submission
    await invalidateUserCache(userId.toString());

    logger.info(`Claim submitted successfully: ${claimId} by user ${userId}`);

    // Send acknowledgement email to claimant (best-effort, do not block response)
    try {
      const claimOwner = await User.findById(userId);
      if (claimOwner && claimOwner.email) {
        const sent = await sendClaimStatusEmail(claimOwner.email, claim.claimId, 'Submitted');
        if (sent) {
          logger.info(`Claim submission email sent to ${claimOwner.email} for ${claim.claimId}`);
        } else {
          logger.warn(`Claim submission email failed to send to ${claimOwner.email} for ${claim.claimId}`);
        }
      } else {
        logger.warn(`Claim submission: user email missing for userId ${userId}`);
      }
    } catch (emailErr) {
      logger.error('Error sending claim submission email:', emailErr);
    }

    return res.status(200).json({
      success: true,
      claimId,
      message: 'Claim submitted successfully. You will be notified about the status.',
      data: {
        claimId,
        status: claim.status,
        submittedAt: claim.submittedAt,
        documentCount: documentMetadata.length
      }
    });

  } catch (error) {
    logger.error('Error submitting claim:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error submitting claim', 
      error: error.message 
    });
  }
};

/**
 * GET /api/claims
 * Get all claims for the authenticated user
 */
const getUserClaims = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const claims = await Claim.find({ userId })
      .populate('policyId', 'name type insurer premium')
      .sort({ submittedAt: -1 });

    // Return minimal fields for list view
    const mapped = claims.map(c => ({
      _id: c._id,
      claimId: c.claimId,
      policyId: c.policyId,
      status: c.status,
      submittedAt: c.submittedAt,
      updatedAt: c.updatedAt,
      documents: c.documents || [],
      notes: c.notes || ''
    }));

    return res.status(200).json({
      success: true,
      count: mapped.length,
      data: mapped
    });

  } catch (error) {
    logger.error('Error fetching user claims:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching claims', 
      error: error.message 
    });
  }
};

/**
 * GET /api/claims/:claimId
 * Get details of a specific claim
 */
const getClaimById = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { claimId, id } = req.params;
    const lookupId = claimId || id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const claim = await Claim.findOne({ claimId: lookupId })
      .populate('policyId', 'name type insurer premium coverage')
      .populate('userId', 'firstName lastName email');

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    // Verify ownership (or admin access)
    if (claim.userId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      data: claim
    });

  } catch (error) {
    logger.error('Error fetching claim:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching claim details', 
      error: error.message 
    });
  }
};

/**
 * GET /api/claims/:claimId/documents/:filename
 * Returns a document file for a claim if the requester is the owner or admin
 */
const getClaimByIdDocument = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { claimId, filename } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const claim = await Claim.findOne({ claimId }).populate('userId', 'email');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    // Ownership or admin check
    if (claim.userId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const matched = (claim.documents || []).find(d => d.filename === filename);
    if (!matched) return res.status(404).json({ success: false, message: 'Document not found' });

    // Use absolute path saved in metadata
    const filePath = matched.path;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File missing on server' });
    }

    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    logger.error('Error fetching claim document:', error);
    return res.status(500).json({ success: false, message: 'Error fetching document', error: error.message });
  }
};

/**
 * PUT /api/claims/:id/status
 * Admin endpoint to update claim status
 */
const updateClaimStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { id } = req.params;
    const { status, note } = req.body;

    const allowed = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Closed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const claim = await Claim.findOne({ claimId: id });
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    claim.status = status;
    claim.history = claim.history || [];
    claim.history.push({ status, updatedAt: new Date(), note: note || '', updatedBy: user._id });
    claim.lastUpdatedBy = user._id;
    claim.updatedAt = Date.now();

    await claim.save();

    // Log to claims.log
    logStatusChange(claim.claimId, status, user.email || user._id);

    // Invalidate claim owner's cache after status update
    await invalidateUserCache(claim.userId.toString());

    // Notify user by email (best-effort)
    try {
      const claimOwner = await User.findById(claim.userId);
      if (claimOwner && claimOwner.email) {
        await sendClaimStatusEmail(claimOwner.email, claim.claimId, status);
      }
    } catch (emailErr) {
      logger.error('Error sending claim status email:', emailErr);
    }

    return res.status(200).json({ success: true, message: 'Status updated', data: { claimId: claim.claimId, status } });

  } catch (error) {
    logger.error('Error updating claim status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

/**
 * GET /api/claims/admin
 * Admin-only: list all claims with optional pagination and filters
 */
const getAllClaimsAdmin = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userEmail) {
      // simple search by user email - will populate and filter in-memory fallback
    }

    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .populate('policyId', 'name type insurer')
        .populate('userId', 'firstName lastName email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      Claim.countDocuments(filter)
    ]);

    const mapped = claims.map(c => ({
      _id: c._id,
      claimId: c.claimId,
      policy: c.policyId,
      user: c.userId,
      status: c.status,
      submittedAt: c.submittedAt,
      updatedAt: c.updatedAt,
      documentCount: (c.documents || []).length,
      lastUpdatedBy: c.lastUpdatedBy
    }));

    return res.status(200).json({ success: true, count: mapped.length, total, page, limit, data: mapped });
  } catch (error) {
    logger.error('Error listing claims for admin:', error);
    return res.status(500).json({ success: false, message: 'Failed to list claims', error: error.message });
  }
};

module.exports = {
  submitClaim,
  getUserClaims,
  getClaimById,
  getClaimByIdDocument,
  updateClaimStatus,
  getAllClaimsAdmin
};
