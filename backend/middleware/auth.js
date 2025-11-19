import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Middleware to authenticate JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token required'
    });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    req.userId = decoded.userId;
    next();
  });
};

// Middleware to optionally authenticate token (for public/private routes)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.userId = decoded.userId;
      }
    });
  }

  next();
};
