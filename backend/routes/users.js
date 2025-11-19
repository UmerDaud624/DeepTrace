import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    await executeQuery(
      'UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?',
      [firstName, lastName, req.userId]
    );

    res.json({
      status: 'success',
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
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
