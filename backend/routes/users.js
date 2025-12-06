import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware for profile update
const validateProfileUpdate = [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('fullName').optional().trim().isLength({ min: 1 }),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 })
];

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = users[0];

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, fullName, firstName, lastName } = req.body;
    const updateFields = [];
    const updateValues = [];

    // Handle email update
    if (email) {
      // Check if email is already taken by another user
      const existingUsers = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken by another user'
        });
      }

      updateFields.push('email = ?');
      updateValues.push(email);
    }

    // Handle password update
    if (password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    // Handle name update - prioritize fullName if provided, otherwise use firstName/lastName
    let finalFirstName = firstName;
    let finalLastName = lastName;

    if (fullName) {
      // Split fullName into firstName and lastName
      const nameParts = fullName.trim().split(/\s+/);
      finalFirstName = nameParts[0] || '';
      finalLastName = nameParts.slice(1).join(' ') || '';
    }

    if (finalFirstName !== undefined || finalLastName !== undefined) {
      // Get current user data if we need to preserve existing values
      const currentUsers = await executeQuery(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [req.userId]
      );

      if (currentUsers.length > 0) {
        const currentUser = currentUsers[0];
        finalFirstName = finalFirstName !== undefined ? finalFirstName : currentUser.first_name;
        finalLastName = finalLastName !== undefined ? finalLastName : currentUser.last_name;
      }

      updateFields.push('first_name = ?');
      updateFields.push('last_name = ?');
      updateValues.push(finalFirstName, finalLastName);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields provided to update'
      });
    }

    // Add updated_at and user_id for WHERE clause
    updateFields.push('updated_at = NOW()');
    updateValues.push(req.userId);

    // Build and execute update query
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(updateQuery, updateValues);

    // Fetch updated user data
    const updatedUsers = await executeQuery(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const updatedUser = updatedUsers[0];

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          createdAt: updatedUser.created_at
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
});

// @route   GET /api/users/history
// @desc    Get user analysis history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const analyses = await executeQuery(
      `SELECT id, file_name, file_type, analysis_result, confidence_score, 
              created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json({
      status: 'success',
      data: {
        analyses
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;
