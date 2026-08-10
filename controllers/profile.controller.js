const User = require('../models/user.model');
const { logger, auditLog } = require('../config/logger');

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile.',
      code: 'PROFILE_ERROR'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    console.log('Profile update request body:', req.body);
    console.log('Profile update request headers:', req.headers);
    const { firstName, lastName, phone, dateOfBirth, address } = req.body;
    
    // Get current user data for comparison
    const currentUser = await User.findById(req.user.id);
    const changes = {};

    // Prepare update object
    const updateData = {};
    
    if (firstName !== undefined) {
      updateData.firstName = firstName;
      if (currentUser.firstName !== firstName) changes.firstName = { from: currentUser.firstName, to: firstName };
    }
    
    if (lastName !== undefined) {
      updateData.lastName = lastName;
      if (currentUser.lastName !== lastName) changes.lastName = { from: currentUser.lastName, to: lastName };
    }
    
    if (phone !== undefined) {
      updateData.phone = phone;
      if (currentUser.phone !== phone) changes.phone = { from: currentUser.phone, to: phone };
    }
    
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth;
      if (currentUser.dateOfBirth?.toString() !== dateOfBirth) {
        changes.dateOfBirth = { from: currentUser.dateOfBirth, to: dateOfBirth };
      }
    }
    
    if (address !== undefined) {
      updateData.address = address;
      if (JSON.stringify(currentUser.address) !== JSON.stringify(address)) {
        changes.address = { from: currentUser.address, to: address };
      }
    }

    // Check if there are any changes
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No changes provided.',
        code: 'NO_CHANGES'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Log profile update
    auditLog.profileUpdate(req.user.id, req.user.email, changes, req.ip);

    logger.info(`Profile updated for user: ${req.user.email}`);

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Failed to update profile.',
      code: 'UPDATE_ERROR'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    auditLog.profileUpdate(req.user.id, req.user.email, { action: 'PASSWORD_CHANGE' }, req.ip);

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({
      message: 'Password changed successfully.'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Failed to change password.',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

/**
 * Deactivate account
 */
const deactivateAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Password is incorrect.',
        code: 'INVALID_PASSWORD'
      });
    }

    // Deactivate account
    await User.findByIdAndUpdate(req.user.id, { isActive: false });

    // Log account deactivation
    auditLog.profileUpdate(req.user.id, req.user.email, { action: 'ACCOUNT_DEACTIVATED' }, req.ip);

    logger.info(`Account deactivated for user: ${req.user.email}`);

    res.json({
      message: 'Account deactivated successfully.'
    });

  } catch (error) {
    logger.error('Deactivate account error:', error);
    res.status(500).json({
      error: 'Failed to deactivate account.',
      code: 'DEACTIVATION_ERROR'
    });
  }
};

/**
 * Get user activity log (admin only)
 */
const getActivityLog = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // If userId specified, get logs for that user (admin can view any user)
    const targetUserId = userId || req.user.id;

    // Authorization: allow if requester is admin OR requesting their own logs
    if (userId) {
      const isAdmin = req.user && req.user.role === 'admin';
      const isSelf = String(req.user && (req.user.id || req.user._id)) === String(userId);
      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          error: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    }
    
    // For demo purposes, return sample activity log
    // In production, this would query an audit log collection
    res.json({
  // Ensure userId is returned as a string for stable comparisons in tests
  userId: targetUserId && targetUserId.toString ? targetUserId.toString() : String(targetUserId),
      activities: [
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          action: 'LOGIN',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          status: 'success'
        },
        {
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          action: 'PROFILE_UPDATE',
          ip: '127.0.0.1',
          changes: { phone: 'updated' },
          status: 'success'
        }
      ],
      note: 'Full activity tracking will be implemented in the monitoring module.'
    });

  } catch (error) {
    logger.error('Get activity log error:', error);
    res.status(500).json({
      error: 'Failed to get activity log.',
      code: 'ACTIVITY_LOG_ERROR'
    });
  }
};

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    logger.info(`Admin ${req.user.email} viewed users list`);

    res.json({
      users: users.map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users.',
      code: 'GET_USERS_ERROR'
    });
  }
};

/**
 * Get user by ID (admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    logger.info(`Admin ${req.user.email} viewed user ${user.email}`);

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        failedLoginAttempts: user.failedLoginAttempts,
        lockoutUntil: user.lockoutUntil,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to get user.',
      code: 'GET_USER_ERROR'
    });
  }
};

/**
 * Update user role (admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be "user" or "admin".',
        code: 'INVALID_ROLE'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        error: 'Cannot change your own role.',
        code: 'SELF_ROLE_CHANGE'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    auditLog.profileUpdate(req.user.id, req.user.email, { 
      action: 'ROLE_CHANGE',
      targetUser: user.email,
      roleChange: { from: oldRole, to: role }
    }, req.ip);

    logger.info(`Admin ${req.user.email} changed role of ${user.email} from ${oldRole} to ${role}`);

    res.json({
      message: 'User role updated successfully.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({
      error: 'Failed to update user role.',
      code: 'UPDATE_ROLE_ERROR'
    });
  }
};

/**
 * Deactivate/activate user (admin only)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        error: 'Cannot change your own account status.',
        code: 'SELF_STATUS_CHANGE'
      });
    }

    user.isActive = isActive;
    await user.save();

    auditLog.profileUpdate(req.user.id, req.user.email, { 
      action: isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      targetUser: user.email
    }, req.ip);

    logger.info(`Admin ${req.user.email} ${isActive ? 'activated' : 'deactivated'} account of ${user.email}`);

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: {
        id: user._id,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status.',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
};

/**
 * Get system statistics (admin only)
 */
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    
    // Get recent registrations (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({ 
      createdAt: { $gte: weekAgo } 
    });

    // Get recent logins (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await User.countDocuments({ 
      lastLogin: { $gte: dayAgo } 
    });

    logger.info(`Admin ${req.user.email} viewed system statistics`);

    res.json({
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: adminUsers,
          regularUsers: totalUsers - adminUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers
        },
        activity: {
          recentRegistrations: {
            count: recentRegistrations,
            period: '7 days'
          },
          recentLogins: {
            count: recentLogins,
            period: '24 hours'
          }
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      error: 'Failed to get system statistics.',
      code: 'STATS_ERROR'
    });
  }
};

module.exports = {
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
};
