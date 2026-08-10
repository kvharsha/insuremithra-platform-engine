
const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Expanded enum to include additional types for Epic 2
  type: { type: String, enum: ['2W', '4W', 'Health', 'Life', 'Travel'], required: true, trim: true },
  // Model refers to vehicle model or policy model/name for search
  model: { type: String, required: true, trim: true },
  insurer: { type: String, required: true, trim: true },
  premium: { type: Number, required: true, min: 0 },
  coverage: { type: String, required: true, trim: true },
  tenure: { type: String, default: '1 year', trim: true },
  description: { type: String, required: false, trim: true },
  exclusions: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Indexes to speed up common search queries
PolicySchema.index({ type: 1 });
PolicySchema.index({ insurer: 1 });
PolicySchema.index({ model: 'text', name: 'text' });

module.exports = mongoose.model('Policy', PolicySchema);


