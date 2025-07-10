import { Router } from 'express';
import passport, { strategy } from '../auth.js';

const router = Router();

// Middleware to ensure a user is authenticated
export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Return 401 for API requests
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: '/auth/login'
    });
  }
  
  // Redirect to login for other requests
  res.redirect('/auth/login');
};

// Optional middleware for user info (doesn't require auth)
export const addUserInfo = (req, res, next) => {
  res.locals.user = req.user || null;
  next();
};

export default router; 