const Purchase = require('../models/purchase.model');
const Policy = require('../models/policy.model');
const Renewal = require('../models/renewal.model');
const { logger } = require('../config/logger');
const { calculateDaysUntilExpiry, isEligibleForRenewal, calculateNewExpiry } = require('../utils/renewalCalculator');
const { generateTransactionId } = require('../utils/transactionId');
const { processPayment } = require('../services/payment.service');
const { sendEmail } = require('../config/mailer');
const { sendRenewalSuccessEmail } = require('../utils/renewalSuccessMailer');
const fs = require('fs').promises;
const path = require('path');

const RENEWAL_WINDOW_DAYS = parseInt(process.env.RENEWAL_WINDOW_DAYS) || 7;

/**
 * Check renewal eligibility for a purchase
 * GET /api/renewals/eligibility/:purchaseId
 */
const checkEligibility = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const userId = req.user._id || req.user.id;

    // Find purchase and populate policy details
    const purchase = await Purchase.findById(purchaseId).populate('policyId');
    
    if (!purchase) {
      return res.status(404).json({
        error: 'Purchase not found',
        code: 'PURCHASE_NOT_FOUND'
      });
    }

    // Verify user owns this purchase
    if (purchase.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You do not have permission to renew this policy',
        code: 'UNAUTHORIZED_RENEWAL'
      });
    }

    // Check if purchase has expiry date
    if (!purchase.expiryDate) {
      return res.status(400).json({
        error: 'This purchase does not have an expiry date set',
        code: 'NO_EXPIRY_DATE'
      });
    }

    const daysLeft = calculateDaysUntilExpiry(purchase.expiryDate);
    const eligible = isEligibleForRenewal(purchase.expiryDate, RENEWAL_WINDOW_DAYS);
    
    // Calculate renewal amount (same as original premium for now)
    const renewalAmount = purchase.policyId.premium;

    logger.info(`Eligibility check for purchase ${purchaseId}: eligible=${eligible}, daysLeft=${daysLeft}`);

    res.json({
      eligible,
      purchaseId: purchase._id,
      policyName: purchase.policyId.name,
      policyType: purchase.policyId.type,
      expiryDate: purchase.expiryDate,
      daysLeft: Math.max(0, daysLeft),
      renewalAmount,
      currency: purchase.currency,
      renewalWindowDays: RENEWAL_WINDOW_DAYS,
      message: eligible 
        ? 'Your policy is eligible for renewal' 
        : `Renewal will be available ${RENEWAL_WINDOW_DAYS} days before expiry`
    });

  } catch (error) {
    logger.error('Eligibility check error:', error);
    res.status(500).json({
      error: 'Failed to check renewal eligibility',
      code: 'ELIGIBILITY_CHECK_ERROR'
    });
  }
};

/**
 * Initiate renewal process
 * POST /api/renewals/initiate
 */
const initiateRenewal = async (req, res) => {
  try {
    const { purchaseId, paymentMethod } = req.body;
    const userId = req.user._id || req.user.id;

    if (!purchaseId || !paymentMethod) {
      return res.status(400).json({
        error: 'Purchase ID and payment method are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Find purchase and populate policy
    const purchase = await Purchase.findById(purchaseId).populate('policyId');
    
    if (!purchase) {
      return res.status(404).json({
        error: 'Purchase not found',
        code: 'PURCHASE_NOT_FOUND'
      });
    }

    // Verify ownership
    if (purchase.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You do not have permission to renew this policy',
        code: 'UNAUTHORIZED_RENEWAL'
      });
    }

    // Check eligibility
    if (!isEligibleForRenewal(purchase.expiryDate, RENEWAL_WINDOW_DAYS)) {
      const daysLeft = calculateDaysUntilExpiry(purchase.expiryDate);
      return res.status(400).json({
        error: `Renewal not yet available. Renewal window opens ${RENEWAL_WINDOW_DAYS} days before expiry.`,
        code: 'NOT_ELIGIBLE',
        daysLeft: Math.max(0, daysLeft)
      });
    }

    // Check for existing pending renewal
    const existingRenewal = await Renewal.findOne({
      purchaseId,
      status: { $in: ['initiated', 'processing'] }
    });

    if (existingRenewal) {
      return res.status(400).json({
        error: 'A renewal is already in progress for this purchase',
        code: 'RENEWAL_IN_PROGRESS',
        renewalId: existingRenewal._id,
        transactionId: existingRenewal.transactionId
      });
    }

    // Generate transaction ID
    const transactionId = generateTransactionId('REN');
    const renewalAmount = purchase.policyId.premium;

    // Create renewal record
    const renewal = new Renewal({
      userId,
      purchaseId,
      transactionId,
      status: 'initiated',
      amount: renewalAmount,
      currency: purchase.currency,
      paymentMethod,
      oldExpiryDate: purchase.expiryDate
    });

    await renewal.save();

    logger.info(`Renewal initiated: ${transactionId} for purchase ${purchaseId}`);

    // Process payment asynchronously
    setImmediate(async () => {
      try {
        renewal.status = 'processing';
        await renewal.save();

        const paymentResult = await processPayment({
          amount: renewalAmount,
          currency: purchase.currency,
          paymentMethod,
          transactionId
        });

        if (paymentResult.success) {
          await completeRenewalSuccess(renewal, purchase, paymentResult);
        } else {
          await completeRenewalFailure(renewal, purchase, paymentResult);
        }
      } catch (error) {
        logger.error(`Payment processing error for ${transactionId}:`, error);
        await completeRenewalFailure(renewal, purchase, { error: error.message });
      }
    });

    res.status(202).json({
      success: true,
      message: 'Renewal initiated. Processing payment...',
      renewalId: renewal._id,
      transactionId,
      status: 'processing'
    });

  } catch (error) {
    logger.error('Initiate renewal error:', error);
    res.status(500).json({
      error: 'Failed to initiate renewal',
      code: 'RENEWAL_INITIATION_ERROR'
    });
  }
};

/**
 * Complete renewal on successful payment
 */
const completeRenewalSuccess = async (renewal, purchase, paymentResult) => {
  try {
    // Calculate new expiry date
    // Re-fetch purchase with populated policy to get tenure
    const fullPurchase = await Purchase.findById(purchase._id).populate('policyId');
    if (!fullPurchase || !fullPurchase.policyId) {
      // Gracefully handle missing purchase/policy in async processing
      const errMsg = 'Purchase or policy not found';
      logger.error(errMsg);
      renewal.status = 'failed';
      renewal.errorMessage = errMsg;
      renewal.completedAt = new Date();
      try { await renewal.save(); } catch (saveErr) { void saveErr; }
      await logRenewalEvent({
        event: 'RENEWAL_FAILED',
        transactionId: renewal.transactionId,
        purchaseId: purchase._id,
        userId: renewal.userId,
        amount: renewal.amount,
        error: errMsg,
        timestamp: new Date().toISOString()
      });
      return; // stop further processing
    }
    
    const policy = fullPurchase.policyId;
    const newExpiryDate = calculateNewExpiry(purchase.expiryDate, policy.tenure);

    // Update renewal record
    renewal.status = 'success';
    renewal.newExpiryDate = newExpiryDate;
    renewal.gatewayTransactionId = paymentResult.gatewayTransactionId;
    renewal.gatewayReceipt = paymentResult.gatewayReceipt;
    renewal.completedAt = new Date();
    await renewal.save();

    // Update purchase record
    const oldExpiry = purchase.expiryDate;
    purchase.expiryDate = newExpiryDate;
    purchase.renewalStatus = 'renewed';
    purchase.lastRenewedAt = new Date();
    purchase.renewalHistory.push({
      amount: renewal.amount,
      paidAt: new Date(),
      transactionId: renewal.transactionId,
      oldExpiry: oldExpiry,
      newExpiry: newExpiryDate
    });
    await purchase.save();

    // Log to renewals.log
    await logRenewalEvent({
      event: 'RENEWAL_SUCCESS',
      transactionId: renewal.transactionId,
      purchaseId: purchase._id,
      policyNumber: purchase.policyNumber || policy.policyNumber || policy.name || '',
      userId: renewal.userId,
      amount: renewal.amount,
      oldExpiry: oldExpiry,
      newExpiry: newExpiryDate,
      timestamp: new Date().toISOString()
    });

    // Send success email (use utility). Don't block on email failure.
    try {
      const user = await require('../models/user.model').findById(renewal.userId);
      const policy = await Policy.findById(purchase.policyId);
      if (user && user.email) {
        await sendRenewalSuccessEmail(
          user.email,
          user.firstName || user.email,
          purchase.policyNumber || policy.name || '',
          newExpiryDate.toISOString().split('T')[0]
        );
        logger.info(`Renewal success email sent to ${user.email}`);
      } else {
        logger.warn(`Renewal success: user email missing for userId ${renewal.userId}`);
      }
    } catch (emailErr) {
      logger.error('Email send failed for renewal success', emailErr);
    }

    logger.info(`Renewal completed successfully: ${renewal.transactionId}`);

  } catch (error) {
    logger.error('Error completing renewal:', error);
    throw error;
  }
};

/**
 * Complete renewal on payment failure
 */
const completeRenewalFailure = async (renewal, purchase, paymentResult) => {
  try {
    // Update renewal record
    renewal.status = 'failed';
    renewal.errorMessage = paymentResult.error || paymentResult.message;
    renewal.errorCode = paymentResult.errorCode;
    renewal.completedAt = new Date();
    await renewal.save();

    // Log to renewals.log
    await logRenewalEvent({
      event: 'RENEWAL_FAILED',
      transactionId: renewal.transactionId,
      purchaseId: purchase._id,
      userId: renewal.userId,
      amount: renewal.amount,
      error: renewal.errorMessage,
      timestamp: new Date().toISOString()
    });

    // Send failure email
    await sendRenewalFailureEmail(renewal, purchase);

    logger.warn(`Renewal failed: ${renewal.transactionId}`);

  } catch (error) {
    logger.error('Error handling renewal failure:', error);
    throw error;
  }
};

/**
 * Get renewal status
 * GET /api/renewals/:renewalId
 */
const getRenewalStatus = async (req, res) => {
  try {
    const { renewalId } = req.params;
    const userId = req.user._id || req.user.id;

    const renewal = await Renewal.findById(renewalId)
      .populate('purchaseId')
      .populate({
        path: 'purchaseId',
        populate: { path: 'policyId' }
      });

    if (!renewal) {
      return res.status(404).json({
        error: 'Renewal not found',
        code: 'RENEWAL_NOT_FOUND'
      });
    }

    // Verify ownership
    if (renewal.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You do not have permission to view this renewal',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    res.json({
      renewal: {
        id: renewal._id,
        transactionId: renewal.transactionId,
        status: renewal.status,
        amount: renewal.amount,
        currency: renewal.currency,
        paymentMethod: renewal.paymentMethod,
        oldExpiryDate: renewal.oldExpiryDate,
        newExpiryDate: renewal.newExpiryDate,
        createdAt: renewal.createdAt,
        completedAt: renewal.completedAt,
        errorMessage: renewal.errorMessage
      },
      purchase: {
        id: renewal.purchaseId._id,
        policyNumber: renewal.purchaseId.policyNumber,
        policyName: renewal.purchaseId.policyId.name
      }
    });

  } catch (error) {
    logger.error('Get renewal status error:', error);
    res.status(500).json({
      error: 'Failed to get renewal status',
      code: 'GET_RENEWAL_ERROR'
    });
  }
};

/**
 * Get user's renewal history
 * GET /api/renewals/my
 */
const getMyRenewals = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const renewals = await Renewal.find({ userId })
      .populate({
        path: 'purchaseId',
        populate: { path: 'policyId' }
      })
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Renewal.countDocuments({ userId });

    res.json({
      renewals: renewals.map(r => ({
        id: r._id,
        transactionId: r.transactionId,
        status: r.status,
        amount: r.amount,
        currency: r.currency,
        policyName: r.purchaseId?.policyId?.name,
        policyType: r.purchaseId?.policyId?.type,
        oldExpiryDate: r.oldExpiryDate,
        newExpiryDate: r.newExpiryDate,
        createdAt: r.createdAt,
        completedAt: r.completedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Get my renewals error:', error);
    res.status(500).json({
      error: 'Failed to get renewal history',
      code: 'GET_RENEWALS_ERROR'
    });
  }
};

/**
 * Log renewal event to renewals.log
 */
const logRenewalEvent = async (eventData) => {
  try {
    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'renewals.log');
    
    // Ensure logs directory exists
    await fs.mkdir(logsDir, { recursive: true });
    
    // Append log entry as JSON line
    const logEntry = JSON.stringify(eventData) + '\n';
    await fs.appendFile(logFile, logEntry);
  } catch (error) {
    logger.error('Error writing to renewals.log:', error);
  }
};



/**
 * Send renewal failure email
 */
const sendRenewalFailureEmail = async (renewal, purchase) => {
  try {
    const user = await require('../models/user.model').findById(renewal.userId);
    const policy = await Policy.findById(purchase.policyId);

    // Load email template
    const templatePath = path.join(__dirname, '../templates/renewalFailure.html');
    let html;
    try {
      html = await fs.readFile(templatePath, 'utf8');
    } catch (err) {
      void err;
      // Fallback to simple text if template doesn't exist
      html = `
        <h2>Policy Renewal Failed</h2>
        <p>Dear ${user.firstName},</p>
        <p>We were unable to process your renewal for policy <strong>${policy.name}</strong>.</p>
        <p><strong>Transaction ID:</strong> ${renewal.transactionId}</p>
        <p><strong>Reason:</strong> ${renewal.errorMessage || 'Payment processing failed'}</p>
        <p>Please try again or contact our support team.</p>
        <p>Thank you for choosing InsureMithra!</p>
      `;
    }

    // Replace placeholders
    html = html.replace(/{{userName}}/g, user.firstName)
      .replace(/{{policyName}}/g, policy.name)
      .replace(/{{transactionId}}/g, renewal.transactionId)
      .replace(/{{errorMessage}}/g, renewal.errorMessage || 'Payment processing failed');

    await sendEmail({
      to: user.email,
      subject: 'Policy Renewal Failed - InsureMithra',
      html,
      text: `Your policy renewal for ${policy.name} failed. Transaction ID: ${renewal.transactionId}. Please try again.`
    });

    logger.info(`Renewal failure email sent to ${user.email}`);
  } catch (error) {
    logger.error('Error sending renewal failure email:', error);
  }
};

module.exports = {
  checkEligibility,
  initiateRenewal,
  getRenewalStatus,
  getMyRenewals
};
