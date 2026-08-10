const Policy = require('../models/policy.model');
const { logger } = require('../config/logger');
const mongoose = require('mongoose');

// GET /api/policies/search
// Query params supported: type, model, insurer, minPrice, maxPrice
const searchPolicies = async (req, res) => {
  try {
    const { type, model, insurer, minPrice, maxPrice } = req.query;

    const filters = {};

    if (type) {
      // Exact match for type (case-insensitive)
      filters.type = new RegExp(`^${String(type).trim()}$`, 'i');
    }

    if (model) {
      // Partial match on model
      filters.model = new RegExp(String(model).trim(), 'i');
    }

    if (insurer) {
      filters.insurer = new RegExp(String(insurer).trim(), 'i');
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter = {};
      if (minPrice !== undefined && minPrice !== '') priceFilter.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') priceFilter.$lte = Number(maxPrice);
      if (Object.keys(priceFilter).length) filters.premium = priceFilter;
    }

    const policies = await Policy.find(filters).sort({ premium: 1 }).limit(1000);

    return res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    logger.error('Error fetching policies:', error);
    return res.status(500).json({ success: false, message: 'Error fetching policies', error: error.message });
  }
};

// POST /api/policies/compare
// Body: { policyIds: ["id1","id2", ...] }
const comparePolicies = async (req, res) => {
  try {
    const { policyIds } = req.body;

    if (!Array.isArray(policyIds)) {
      return res.status(400).json({ success: false, message: 'policyIds must be an array of 2-3 policy IDs' });
    }

    if (policyIds.length < 2 || policyIds.length > 3) {
      return res.status(400).json({ success: false, message: 'Provide at least 2 and at most 3 policy IDs to compare' });
    }

    // deduplicate check
    const uniqueIds = [...new Set(policyIds)];
    if (uniqueIds.length !== policyIds.length) {
      return res.status(400).json({ success: false, message: 'Duplicate policy IDs are not allowed' });
    }

    // validate ObjectId format
    const invalid = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(String(id)));
    if (invalid.length) {
      return res.status(400).json({ success: false, message: 'One or more policy IDs are invalid', invalid });
    }

    const policies = await Policy.find({ _id: { $in: uniqueIds } });

    if (!policies || policies.length !== uniqueIds.length) {
      const found = (policies || []).map((p) => p._id.toString());
      const missing = uniqueIds.filter((id) => !found.includes(id));
      return res.status(404).json({ success: false, message: 'Some policies were not found', missing });
    }

    // preserve client-provided order
    const ordered = uniqueIds.map((id) => policies.find((p) => p._id.toString() === id));

    return res.status(200).json({ success: true, count: ordered.length, data: ordered });
  } catch (error) {
    logger.error('Error comparing policies:', error);
    return res.status(500).json({ success: false, message: 'Error comparing policies', error: error.message });
  }
};

// GET /api/policies/:id
// Fetch full details of a single policy by ID
const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid policy ID format' });
    }

    const policy = await Policy.findById(id);

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    logger.error('Error fetching policy by ID:', error);
    return res.status(500).json({ success: false, message: 'Error fetching policy', error: error.message });
  }
};

module.exports = { searchPolicies, comparePolicies, getPolicyById };


