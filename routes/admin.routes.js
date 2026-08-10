const express = require('express');
const Downtime = require('../models/downtime.model');
const { runHealthCheck, getConfig } = require('../scheduler/downtimeMonitor');
const { getAllServiceStates } = require('../services/downtime.service');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const { logger } = require('../config/logger');
const path = require('path');
const fs = require('fs');
const { runBackupJob, listBackups } = require('../services/backup.service');
const { restoreBackup } = require('../services/restore.service');

const router = express.Router();

/**
 * GET /admin/downtimes
 * Get downtime history (admin only)
 */
router.get('/downtimes', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, service, status } = req.query;
    
    const query = {};
    if (service) query.service = service;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [incidents, total] = await Promise.all([
      Downtime.find(query)
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Downtime.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('Error fetching downtimes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch downtime history'
    });
  }
});

/**
 * POST /admin/downtimes/test
 * Manually trigger health check (admin only)
 */
router.post('/downtimes/test', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    logger.info(`Manual health check triggered by admin: ${req.user.email}`);
    
    // Run health check asynchronously
    const results = await runHealthCheck();
    
    res.json({
      success: true,
      message: 'Health check completed',
      data: {
        timestamp: new Date(),
        results,
        triggeredBy: req.user.email
      }
    });
    
  } catch (error) {
    logger.error('Error running manual health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run health check'
    });
  }
});

/**
 * GET /admin/downtimes/monitor/config
 * Get monitor configuration and status
 */
router.get('/downtimes/monitor/config', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const config = getConfig();
    const serviceStates = getAllServiceStates();
    
    res.json({
      success: true,
      data: {
        config,
        serviceStates,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error fetching monitor config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor configuration'
    });
  }
});

/**
 * GET /admin/downtimes/stats
 * Get downtime statistics
 */
router.get('/downtimes/stats', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const [
      totalIncidents,
      ongoingIncidents,
      recoveredIncidents,
      avgDuration
    ] = await Promise.all([
      Downtime.countDocuments({ startAt: { $gte: startDate } }),
      Downtime.countDocuments({ status: { $in: ['down', 'ongoing'] }, endAt: null }),
      Downtime.countDocuments({ status: 'recovered', startAt: { $gte: startDate } }),
      Downtime.aggregate([
        { $match: { status: 'recovered', durationMs: { $ne: null }, startAt: { $gte: startDate } } },
        { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } }
      ])
    ]);
    
    // Get incidents grouped by service
    const byService = await Downtime.aggregate([
      { $match: { startAt: { $gte: startDate } } },
      { 
        $group: { 
          _id: '$service', 
          count: { $sum: 1 },
          totalDowntime: { $sum: '$durationMs' }
        } 
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        totalIncidents,
        ongoingIncidents,
        recoveredIncidents,
        avgDurationMs: avgDuration[0]?.avgDuration || 0,
        byService
      }
    });
    
  } catch (error) {
    logger.error('Error fetching downtime stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /admin/downtimes/:id
 * Get specific downtime incident details
 */
router.get('/downtimes/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const incident = await Downtime.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      data: incident
    });
    
  } catch (error) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incident details'
    });
  }
});

module.exports = router;

/**
 * Backup endpoints
 */
// List backups
router.get('/backups', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    logger.info(`Admin ${req.user?.email || 'unknown'} requested backup list`);
    const backups = await listBackups();
    logger.info(`Returning ${backups.length} backups to admin ${req.user?.email || 'unknown'}`);
    res.json({ success: true, data: backups });
  } catch (error) {
    logger.error('Error listing backups:', error);
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

// Trigger manual backup
router.post('/backups/run', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    logger.info(`[ADMIN] Manual backup requested by ${req.user?.email || 'unknown'}`);
    
    // Run backup asynchronously to avoid long HTTP timeouts from clients
    runBackupJob()
      .then(result => {
        logger.info('[ADMIN] ✅ Manual backup completed successfully', result);
      })
      .catch(err => {
        logger.error('[ADMIN] ❌ Manual backup failed:', {
          message: err.message,
          stack: err.stack,
          user: req.user?.email
        });
      });

    res.status(202).json({ success: true, message: 'Backup started' });
  } catch (error) {
    logger.error('[ADMIN] Error scheduling manual backup:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule backup' });
  }
});

// Restore backup
router.post('/backups/restore', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) {
      logger.warn('[ADMIN] Restore requested without backupName');
      return res.status(400).json({ success: false, error: 'backupName is required' });
    }

    logger.info(`[ADMIN] Restore requested by ${req.user?.email || 'unknown'} for backup: ${backupName}`);
    const result = await restoreBackup(backupName);
    logger.info(`[ADMIN] ✅ Restore completed successfully for: ${backupName}`);
    res.json({ success: true, message: 'Restore completed', data: result });
  } catch (error) {
    logger.error('[ADMIN] ❌ Error restoring backup:', {
      backupName: req.body.backupName,
      message: error.message,
      stack: error.stack,
      user: req.user?.email
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restore backup', 
      details: error.message 
    });
  }
});

// Download backup
router.get('/backups/download', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      logger.warn('[ADMIN] Download requested without name param');
      return res.status(400).json({ success: false, error: 'name query param required' });
    }
    
    const backupsDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupsDir, name);
    
    if (!fs.existsSync(filePath)) {
      logger.warn(`[ADMIN] ❌ Download failed: backup not found - ${name}`);
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    logger.info(`[ADMIN] Download started by ${req.user?.email || 'unknown'} for backup: ${name}`);
    res.download(filePath, (err) => {
      if (err) {
        logger.error('[ADMIN] ❌ Download failed:', { name, error: err.message });
      } else {
        logger.info(`[ADMIN] ✅ Download completed: ${name}`);
      }
    });
  } catch (error) {
    logger.error('[ADMIN] ❌ Error downloading backup:', {
      name: req.query.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, error: 'Failed to download backup', details: error.message });
  }
});

// Alias: Download by path param
router.get('/backups/download/:name', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, error: 'name param required' });
    const backupsDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupsDir, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Backup not found' });
    res.download(filePath);
  } catch (error) {
    logger.error('Error downloading backup by param:', error);
    res.status(500).json({ success: false, error: 'Failed to download backup' });
  }
});
