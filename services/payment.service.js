const { logger } = require('../config/logger');

/**
 * Mock/Sandbox Payment Gateway Service
 * Supports sandbox mode for development and can be extended for live gateway
 */

const PAYMENT_MODE = process.env.PAYMENT_GATEWAY_MODE || 'sandbox';
const SANDBOX_MIN_MS = parseInt(process.env.SANDBOX_MIN_MS) || 1000;
const SANDBOX_MAX_MS = parseInt(process.env.SANDBOX_MAX_MS) || 3000;

/**
 * Simulate network delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a mock gateway receipt
 */
const generateReceipt = (transactionId) => {
  return {
    receiptId: `RCPT-${transactionId}`,
    gatewayTransactionId: `GTW-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    gateway: 'InsureMithra Sandbox Gateway'
  };
};

/**
 * Process payment through the payment gateway
 * @param {Object} paymentData - Payment details
 * @param {number} paymentData.amount - Amount to charge
 * @param {string} paymentData.currency - Currency code (e.g., 'INR')
 * @param {string} paymentData.paymentMethod - Payment method (e.g., 'card', 'upi', 'netbanking')
 * @param {string} paymentData.transactionId - Unique transaction ID
 * @returns {Promise<Object>} - Payment result
 */
const processPayment = async ({ amount, currency = 'INR', paymentMethod, transactionId }) => {
  logger.info(`Processing payment: ${transactionId}, Amount: ${amount} ${currency}, Method: ${paymentMethod}`);
  
  if (PAYMENT_MODE === 'sandbox') {
    // Simulate network delay
    const delayMs = Math.random() * (SANDBOX_MAX_MS - SANDBOX_MIN_MS) + SANDBOX_MIN_MS;
    await delay(delayMs);
    
    // 90% success rate in sandbox
    const success = Math.random() > 0.1;
    
    if (success) {
      const receipt = generateReceipt(transactionId);
      logger.info(`Payment successful: ${transactionId}`, receipt);
      
      return {
        success: true,
        transactionId,
        gatewayTransactionId: receipt.gatewayTransactionId,
        gatewayReceipt: receipt,
        message: 'Payment processed successfully'
      };
    } else {
      logger.warn(`Payment failed: ${transactionId}`);
      
      return {
        success: false,
        transactionId,
        error: 'Payment declined by gateway',
        errorCode: 'PAYMENT_DECLINED',
        message: 'Payment processing failed'
      };
    }
  } else if (PAYMENT_MODE === 'live') {
    // TODO: Implement actual payment gateway integration
    // This is where you'd call Razorpay, Stripe, PayPal, etc.
    throw new Error('Live payment gateway not yet implemented');
  } else {
    throw new Error(`Invalid PAYMENT_GATEWAY_MODE: ${PAYMENT_MODE}`);
  }
};

/**
 * Verify payment status (for webhook or polling)
 * @param {string} transactionId - Transaction ID to verify
 * @returns {Promise<Object>} - Payment status
 */
const verifyPayment = async (transactionId) => {
  logger.info(`Verifying payment: ${transactionId}`);
  
  if (PAYMENT_MODE === 'sandbox') {
    // In sandbox, we'll just return success
    // In real implementation, this would query the gateway
    return {
      verified: true,
      status: 'success',
      transactionId
    };
  } else {
    throw new Error('Live payment verification not yet implemented');
  }
};

/**
 * Initiate refund (for cancellations or failed renewals)
 * @param {string} transactionId - Original transaction ID
 * @param {number} amount - Amount to refund
 * @returns {Promise<Object>} - Refund result
 */
const initiateRefund = async (transactionId, amount) => {
  logger.info(`Initiating refund: ${transactionId}, Amount: ${amount}`);
  
  if (PAYMENT_MODE === 'sandbox') {
    await delay(1000);
    return {
      success: true,
      refundId: `REF-${transactionId}`,
      amount,
      message: 'Refund initiated successfully'
    };
  } else {
    throw new Error('Live refund not yet implemented');
  }
};

module.exports = {
  processPayment,
  verifyPayment,
  initiateRefund
};
