import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { config } from '../config/env.js';

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 })
];

const validateSignin = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await executeQuery(
      'INSERT INTO users (email, password, first_name, last_name, created_at) VALUES (?, ?, ?, ?, NOW())',
      [email, hashedPassword, firstName, lastName]
    );

    const userId = result.insertId;

    // Generate token
    const token = generateToken(userId);

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        token,
        user: {
          id: userId,
          email,
          firstName,
          lastName
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/signin
// @desc    Authenticate user
// @access  Public
router.post('/signin', validateSignin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const users = await executeQuery(
      'SELECT id, email, password, first_name, last_name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;
