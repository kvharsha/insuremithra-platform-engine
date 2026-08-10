const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  getActivityLog,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  getSystemStats
} = require('../controllers/profile.controller');
const { authenticate, requireAdmin, validateTokenFormat } = require('../middleware/auth');

const router = express.Router();

// Validation rules

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const deactivateAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to deactivate account')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// All profile routes require authentication
router.use(validateTokenFormat);
router.use(authenticate);

// Profile management routes
router.get('/', getProfile);
router.put('/', updateProfile); // Removed validation middleware
router.post('/change-password', changePasswordValidation, handleValidationErrors, changePassword);
router.post('/deactivate', deactivateAccountValidation, handleValidationErrors, deactivateAccount);

// Activity log: allow controller to decide (admin or same user)
router.get('/activity-log', getActivityLog);
router.get('/admin/users', requireAdmin, getAllUsers);
router.get('/admin/users/:userId', requireAdmin, getUserById);
router.put('/admin/users/:userId/role', requireAdmin, updateUserRole);
router.put('/admin/users/:userId/status', requireAdmin, toggleUserStatus);
router.get('/admin/stats', requireAdmin, getSystemStats);

module.exports = router;
