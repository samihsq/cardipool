import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();

// Check for pending join requests for carpools owned by the user
router.get('/pending-requests', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT COUNT(jr.id)::int
       FROM join_requests jr
       JOIN carpools c ON jr.carpool_id = c.id
       WHERE c.created_by = $1 
         AND jr.status = 'pending'
         AND ((c.departure_date + c.departure_time) AT TIME ZONE 'America/Los_Angeles') >= NOW()`,
      [userId]
    );
    const count = result.rows[0].count;
    res.json({ pendingRequests: count });
  } catch (error) {
    console.error('Error fetching pending request count:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// Get unseen join request status updates for the current user
router.get('/my-updates', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
         jr.id,
         jr.status,
         c.title as carpool_title
       FROM join_requests jr
       JOIN carpools c ON jr.carpool_id = c.id
       WHERE jr.user_id = $1 AND jr.viewed_by_requester = FALSE`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// Mark user's unseen notifications as viewed
router.post('/mark-updates-viewed', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      `UPDATE join_requests
       SET viewed_by_requester = TRUE
       WHERE user_id = $1 AND viewed_by_requester = FALSE`,
      [userId]
    );
    res.status(200).json({ message: 'Notifications marked as viewed.' });
  } catch (error) {
    console.error('Error marking notifications as viewed:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router; 