const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  transactionId: { type: String, required: true, index: true },
  status: { type: String, enum: ['initiated', 'processing', 'success', 'failed'], default: 'initiated' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  policyNumber: { type: String },
  pdfPath: { type: String },
  expiryDate: { type: Date },
  renewalStatus: { type: String, enum: ['active', 'renewed', 'expired'], default: 'active' },
  lastRenewedAt: { type: Date },
  renewalHistory: [{
    amount: { type: Number },
    paidAt: { type: Date },
    transactionId: { type: String },
    oldExpiry: { type: Date },
    newExpiry: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PurchaseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Purchase', PurchaseSchema);
