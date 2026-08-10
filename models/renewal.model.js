const mongoose = require('mongoose');

const RenewalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  transactionId: { type: String, required: true, unique: true, index: true },
  status: { 
    type: String, 
    enum: ['initiated', 'processing', 'success', 'failed'], 
    default: 'initiated' 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, required: true },
  gatewayTransactionId: { type: String },
  gatewayReceipt: { type: mongoose.Schema.Types.Mixed },
  oldExpiryDate: { type: Date, required: true },
  newExpiryDate: { type: Date },
  errorMessage: { type: String },
  errorCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

RenewalSchema.index({ userId: 1, createdAt: -1 });
RenewalSchema.index({ purchaseId: 1 });

module.exports = mongoose.model('Renewal', RenewalSchema);
