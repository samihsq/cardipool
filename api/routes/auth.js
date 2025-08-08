import { Router } from 'express';
import passport, { strategy } from '../auth.js';
import pool from '../db.js';

const router = Router();

// Development bypass for testing emails
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-login', async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }
      
      // Find or create the specific test user based on email
      const sunetId = email.split('@')[0];
      let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user;
      
      if (userResult.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO users (sunet_id, email, first_name, last_name, display_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
          [sunetId, email, name.split(' ')[0] || name, name.split(' ')[1] || '', name]
        );
        user = insertResult.rows[0];
      } else {
        // If user exists, just use their data. We can also update it if needed.
        const updateResult = await pool.query(
          `UPDATE users SET display_name = $2, updated_at = NOW()
           WHERE email = $1 RETURNING *`,
          [email, name]
        );
        user = updateResult.rows[0];
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ error: 'Login failed' });
        }
        res.json({ message: 'Development login successful', user: user });
      });
      
    } catch (error) {
      console.error('Development login error:', error);
      res.status(500).json({ error: 'Development login failed' });
    }
  });
  
  router.get('/dev-logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Development logout successful' });
    });
  });
}

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