const mongoose = require('mongoose');

const downtimeSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    trim: true,
    description: 'Name or URL of the monitored service'
  },
  startAt: {
    type: Date,
    required: true,
    description: 'When the downtime incident began'
  },
  endAt: {
    type: Date,
    default: null,
    description: 'When the service recovered (null if still down)'
  },
  durationMs: {
    type: Number,
    default: null,
    description: 'Duration of downtime in milliseconds (calculated when incident closes)'
  },
  status: {
    type: String,
    enum: ['down', 'recovered', 'ongoing'],
    required: true,
    default: 'down',
    description: 'Current status of the incident'
  },
  details: {
    type: String,
    default: '',
    description: 'Additional error details or context'
  },
  alertSent: {
    type: Boolean,
    default: false,
    description: 'Whether an alert email has been sent for this incident'
  },
  recoverySent: {
    type: Boolean,
    default: false,
    description: 'Whether a recovery email has been sent'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
downtimeSchema.index({ service: 1, startAt: -1 });
downtimeSchema.index({ status: 1, createdAt: -1 });

// Virtual for human-readable duration
downtimeSchema.virtual('durationFormatted').get(function() {
  if (!this.durationMs) return 'Ongoing';
  const seconds = Math.floor(this.durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

// Method to close an incident
downtimeSchema.methods.closeIncident = function(endTime = new Date()) {
  this.endAt = endTime;
  this.durationMs = endTime - this.startAt;
  this.status = 'recovered';
  return this.save();
};

// Static method to find ongoing incidents
downtimeSchema.statics.findOngoingIncidents = function(service = null) {
  const query = { status: { $in: ['down', 'ongoing'] }, endAt: null };
  if (service) query.service = service;
  return this.find(query).sort({ startAt: -1 });
};

// Static method to get recent history
downtimeSchema.statics.getRecentHistory = function(limit = 50, service = null) {
  const query = service ? { service } : {};
  return this.find(query)
    .sort({ startAt: -1 })
    .limit(limit)
    .select('-__v');
};

const Downtime = mongoose.model('Downtime', downtimeSchema);

module.exports = Downtime;
