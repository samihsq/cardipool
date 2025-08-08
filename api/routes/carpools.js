import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from './auth.js';
import { sendEmail } from '../email.js';

const router = Router();

// GET all carpools with search and filtering
router.get('/', async (req, res) => {
  try {
    const { search, tags, date_from, date_to, available_only, sortBy, sortOrder, type } = req.query;
    
    let baseQuery = 'SELECT id FROM carpools c';
    const conditions = [];
    const params = [];
    let paramCount = 0;
    
    if (type && type !== 'all') {
        paramCount++;
        conditions.push(`c.carpool_type = $${paramCount}`);
        params.push(type);
    }
    
    if (search) {
      paramCount++;
      const search_param = `$${paramCount}`;
      conditions.push(`(
          c.title ILIKE ${search_param} OR 
          c.description ILIKE ${search_param} OR
          c.event_name ILIKE ${search_param} OR
          c.pickup_details ILIKE ${search_param} OR
          c.dropoff_details ILIKE ${search_param} OR
          EXISTS (
              SELECT 1 FROM carpool_tags ct_search 
              WHERE ct_search.id = ANY(c.tags) AND ct_search.name ILIKE ${search_param}
          )
      )`);
      params.push(`%${search}%`);
    }
    
    if (tags) {
      const tagIds = tags.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (tagIds.length > 0) {
        paramCount++;
        conditions.push(`c.tags @> $${paramCount}`);
        params.push(tagIds);
      }
    }
    
    if (date_from) {
      paramCount++;
      conditions.push(`c.departure_date >= $${paramCount}`);
      params.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      conditions.push(`c.departure_date <= $${paramCount}`);
      params.push(date_to);
    }
    
    if (available_only === 'true') {
      conditions.push(`c.current_passengers < c.capacity`);
    }
    
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const allowedSortBy = ['departure_date', 'created_at', 'capacity'];
    const sanitizedSortBy = allowedSortBy.includes(sortBy) ? `c.${sortBy}` : 'c.departure_date';
    const sanitizedSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const finalQuery = `
      WITH filtered_carpools AS (${baseQuery})
      SELECT 
        c.*,
        u.display_name as creator_name,
        u.sunet_id as creator_sunet_id,
        (SELECT array_agg(json_build_object('id', ct.id, 'name', ct.name, 'color', ct.color))
         FROM carpool_tags ct WHERE ct.id = ANY(c.tags)) as tag_details
      FROM carpools c
      JOIN filtered_carpools fc ON c.id = fc.id
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY
        CASE
          WHEN ((c.departure_date + c.departure_time) AT TIME ZONE 'America/Los_Angeles') < NOW() THEN 1
          ELSE 0
        END,
        ${sanitizedSortBy} ${sanitizedSortOrder} NULLS LAST
    `;
    
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET carpools created by or joined by the current user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      WITH user_trips AS (
        -- Trips the user owns
        SELECT
          c.id,
          'owner' as user_role
        FROM carpools c
        WHERE c.created_by = $1
        
        UNION
        
        -- Trips the user has an active request for (and doesn't own)
        SELECT
          c.id,
          jr.status as user_role
        FROM carpools c
        JOIN join_requests jr ON c.id = jr.carpool_id
        WHERE jr.user_id = $1 AND jr.status IN ('approved', 'pending', 'rejected', 'removed') AND c.created_by != $1
      )
      SELECT
        c.*,
        u.display_name as creator_name,
        u.sunet_id as creator_sunet_id,
        ut.user_role,
        (SELECT array_agg(json_build_object('id', ct.id, 'name', ct.name, 'color', ct.color))
         FROM carpool_tags ct WHERE ct.id = ANY(c.tags)) as tag_details
      FROM carpools c
      JOIN user_trips ut ON c.id = ut.id
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.departure_date DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET carpool by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        c.*, 
        u.display_name as creator_name,
        u.sunet_id as creator_sunet_id,
        u.email as creator_email,
        array_agg(
          CASE WHEN ct.id IS NOT NULL 
          THEN json_build_object('id', ct.id, 'name', ct.name, 'color', ct.color)
          ELSE NULL END
        ) FILTER (WHERE ct.id IS NOT NULL) as tag_details
      FROM carpools c 
      LEFT JOIN users u ON c.created_by = u.id 
      LEFT JOIN carpool_tags ct ON ct.id = ANY(c.tags)
      WHERE c.id = $1
      GROUP BY c.id, u.display_name, u.sunet_id, u.email
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE carpool
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      title, description, email, phone, departure_date, 
      departure_time, capacity, tags, carpool_type,
      event_name, pickup_details, dropoff_details
    } = req.body;
    
    if (!title || !departure_date || !departure_time || !capacity) {
      return res.status(400).json({ error: 'Title, departure date/time, and capacity are required' });
    }
    
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO carpools 
        (title, description, email, phone, departure_date, departure_time, capacity, tags, created_by, carpool_type, event_name, pickup_details, dropoff_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [title, description, email, phone, departure_date, departure_time, capacity, tags || [], userId, carpool_type, event_name, pickup_details, dropoff_details]
    );
    
    const carpoolWithDetails = await pool.query(`
      SELECT c.*, u.display_name as creator_name, u.sunet_id as creator_sunet_id
      FROM carpools c 
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(carpoolWithDetails.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE carpool
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, description, email, phone, departure_date, 
      departure_time, capacity, tags, carpool_type,
      event_name, pickup_details, dropoff_details
    } = req.body;

    const userId = req.user.id;

    // First, verify the user is the creator of the carpool
    const carpool = await pool.query('SELECT created_by FROM carpools WHERE id = $1', [id]);
    if (carpool.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found' });
    }
    if (carpool.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'You are not authorized to edit this carpool' });
    }

    const result = await pool.query(
      `UPDATE carpools SET 
        title = $1, description = $2, email = $3, phone = $4,
        departure_date = $5, departure_time = $6, capacity = $7, tags = $8,
        carpool_type = $9, event_name = $10, pickup_details = $11, dropoff_details = $12,
        updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [
        title, description, email, phone, departure_date, 
        departure_time, capacity, tags || [], carpool_type, 
        event_name, pickup_details, dropoff_details, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool could not be updated' });
    }
    
    const carpoolWithDetails = await pool.query(`
      SELECT c.*, u.display_name as creator_name, u.sunet_id as creator_sunet_id
      FROM carpools c 
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [id]);

    res.json(carpoolWithDetails.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE carpool
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'DELETE FROM carpools WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Carpool not found or you do not have permission to delete it.' });
    }
    
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET join requests for a specific carpool (for the owner)
router.get('/:carpoolId/requests', requireAuth, async (req, res) => {
  const { carpoolId } = req.params;
  const ownerId = req.user.id;

  try {
    const carpool = await pool.query('SELECT created_by FROM carpools WHERE id = $1', [carpoolId]);
    if (carpool.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found' });
    }
    if (carpool.rows[0].created_by !== ownerId) {
      return res.status(403).json({ error: 'You are not authorized to view requests for this carpool' });
    }

    const result = await pool.query(
      `SELECT jr.*, u.display_name, u.sunet_id, u.email
       FROM join_requests jr
       JOIN users u ON jr.user_id = u.id
       WHERE jr.carpool_id = $1
       ORDER BY jr.created_at DESC`,
      [carpoolId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET approved passengers for a specific carpool
router.get('/:carpoolId/passengers', async (req, res) => {
  const { carpoolId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.display_name, u.sunet_id, u.email
       FROM users u
       JOIN join_requests jr ON u.id = jr.user_id
       WHERE jr.carpool_id = $1 AND jr.status = 'approved'`,
      [carpoolId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET the current user's join request status for a specific carpool
router.get('/:carpoolId/my-request-status', requireAuth, async (req, res) => {
  const { carpoolId } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT status FROM join_requests WHERE carpool_id = $1 AND user_id = $2`,
      [carpoolId, userId]
    );
    if (result.rows.length > 0) {
      res.json({ status: result.rows[0].status });
    } else {
      res.json({ status: null }); // No request found
    }
  } catch (error) {
    console.error('Error fetching user request status:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// Route for a user to request to join a carpool
router.post('/:carpoolId/join', requireAuth, async (req, res) => {
  const { carpoolId } = req.params;
  const userId = req.user.id;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if the carpool exists and has capacity
      const carpoolResult = await client.query(
        `SELECT c.*, u.email as owner_email, u.display_name as owner_name 
         FROM carpools c 
         JOIN users u ON c.created_by = u.id 
         WHERE c.id = $1`,
        [carpoolId]
      );
      if (carpoolResult.rows.length === 0) {
        return res.status(404).json({ error: 'Carpool not found.' });
      }

      const carpool = carpoolResult.rows[0];

      // Prevent user from joining their own carpool
      if (carpool.created_by === userId) {
        return res.status(400).json({ error: 'You cannot join your own carpool.' });
      }

      // Check user's existing request status
      const existingRequestResult = await client.query(
        'SELECT * FROM join_requests WHERE carpool_id = $1 AND user_id = $2',
        [carpoolId, userId]
      );

      if (existingRequestResult.rows.length > 0) {
        const existingRequest = existingRequestResult.rows[0];
        const currentStatus = existingRequest.status;

        if (currentStatus === 'pending' || currentStatus === 'approved') {
          return res.status(409).json({ error: `You have already sent a request to join this carpool. Your current status is: ${currentStatus}.` });
        }
        
        // If the status was 'rejected' or 'removed', allow them to re-request by updating the status to 'pending'
        if (currentStatus === 'rejected' || currentStatus === 'removed') {
          await client.query(
            'UPDATE join_requests SET status = $1, updated_at = NOW() WHERE id = $2',
            ['pending', existingRequest.id]
          );
        }
      } else {
        // If no request exists, insert a new one
        await client.query(
          'INSERT INTO join_requests (carpool_id, user_id, status) VALUES ($1, $2, $3)',
          [carpoolId, userId, 'pending']
        );
      }

      await client.query('COMMIT');

      // Send email notification asynchronously (don't make user wait)
      const requesterName = req.user.displayName || req.user.sunet_id;
      sendEmail(
        carpool.owner_email,
        `New Join Request for "${carpool.title}"`,
        `
          <p>Hi ${carpool.owner_name || 'Carpool Owner'},</p>
          <p><strong>${requesterName}</strong> has requested to join your carpool, "<strong>${carpool.title}</strong>".</p>
          <p>Please log in to your Cardipool dashboard to approve or reject this request.</p>
          <br/>
          <p>Thanks,<br/>The Cardipool Team</p>
        `
      ).catch(err => {
        // Log the error, but don't fail the HTTP request because the primary action (DB insert) succeeded.
        console.error(`[Email] Failed to send join request notification to ${carpool.owner_email}:`, err);
      });

      res.status(201).json({ message: 'Join request sent successfully.' });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing join request:', error);
      res.status(500).json({ error: 'An internal error occurred.' });
    } finally {
      client.release();
    }
  } catch(err) {
      console.error('Database connection error:', err);
      res.status(500).json({ error: 'Failed to connect to the database.' });
  }
});


// Route for carpool owner to approve or reject a join request
router.put('/:carpoolId/requests/:requestId', requireAuth, async (req, res) => {
  const { carpoolId, requestId } = req.params;
  const ownerId = req.user.id;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
      }

      // Fetch the request details to get the requester's info
      const requestResult = await client.query(
        `SELECT r.id, r.status, u.id as user_id, u.email as requester_email, u.display_name as requester_name,
                c.id as carpool_id, c.title as carpool_title, c.created_by
         FROM join_requests r
         JOIN users u ON r.user_id = u.id
         JOIN carpools c ON r.carpool_id = c.id
         WHERE r.id = $1 AND r.carpool_id = $2`,
        [requestId, carpoolId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found.' });
      }
      
      const requestDetails = requestResult.rows[0];

      // Verify that the logged-in user is the carpool owner
      if (requestDetails.created_by !== ownerId) {
        return res.status(403).json({ error: 'You are not authorized to manage this request.' });
      }

      // Prevent updating a request that's not pending
      if (requestDetails.status !== 'pending') {
        return res.status(409).json({ error: `This request has already been ${requestDetails.status}.` });
      }

      // If approving, check for capacity
      if (status === 'approved') {
        const carpool = await client.query('SELECT current_passengers, capacity FROM carpools WHERE id = $1 FOR UPDATE', [carpoolId]);
        if (carpool.rows[0].current_passengers >= carpool.rows[0].capacity) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'This carpool is already full.' });
        }
        // Increment passenger count
        await client.query('UPDATE carpools SET current_passengers = current_passengers + 1 WHERE id = $1', [carpoolId]);
      }
      
      // Update the request status and mark it as unread by the requester
      const updatedRequest = await client.query(
        'UPDATE join_requests SET status = $1, viewed_by_requester = FALSE, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, requestId]
      );
      
      await client.query('COMMIT');

      // Send email notification to the requester
      const subject = `Your request for "${requestDetails.carpool_title}" has been ${status}`;
      const htmlBody = `
        <p>Hi ${requestDetails.requester_name || 'there'},</p>
        <p>Your request to join the carpool "<strong>${requestDetails.carpool_title}</strong>" has been <strong>${status}</strong>.</p>
        ${status === 'approved' ? '<p>You can now see this trip in your "My Trips" section on Cardipool.</p>' : ''}
        <br/>
        <p>Thanks,<br/>The Cardipool Team</p>
      `;
      
      sendEmail(requestDetails.requester_email, subject, htmlBody)
        .catch(err => {
          console.error(`[Email] Failed to send status update to ${requestDetails.requester_email}:`, err);
        });

      res.status(200).json(updatedRequest.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating join request:', error);
      res.status(500).json({ error: 'An internal error occurred.' });
    } finally {
      client.release();
    }
  } catch(err) {
      console.error('Database connection error:', err);
      res.status(500).json({ error: 'Failed to connect to the database.' });
  }
});

// Route for carpool owner to remove a passenger from a carpool
router.delete('/:carpoolId/passengers/:userId', requireAuth, async (req, res) => {
  const { carpoolId, userId } = req.params;
  const ownerId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify the current user owns the carpool and get details for the email
    const carpoolResult = await client.query(
      `SELECT c.title, c.created_by, u.display_name as owner_name
       FROM carpools c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [carpoolId]
    );

    if (carpoolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found.' });
    }

    const carpool = carpoolResult.rows[0];
    if (carpool.created_by !== ownerId) {
      return res.status(403).json({ error: 'You are not authorized to modify this carpool.' });
    }
     // Cannot remove the owner
    if (parseInt(userId, 10) === ownerId) {
      return res.status(400).json({ error: 'You cannot remove yourself from a carpool you own.' });
    }

    // Get the removed user's details for the email
    const removedUserResult = await client.query('SELECT display_name, email FROM users WHERE id = $1', [userId]);
    if (removedUserResult.rows.length === 0) {
        // This case should be rare, but good to handle
        return res.status(404).json({ error: 'Passenger to be removed not found.' });
    }
    const removedUser = removedUserResult.rows[0];


    // 2. Set the passenger's join_request status to 'removed' (or another status)
    // This is better than deleting, as it preserves history.
    const updateResult = await client.query(
      `UPDATE join_requests
       SET status = 'removed', updated_at = NOW()
       WHERE carpool_id = $1 AND user_id = $2 AND status = 'approved'
       RETURNING *`,
      [carpoolId, userId]
    );

    // 3. If a row was updated, decrement the passenger count
    if (updateResult.rowCount > 0) {
      await client.query(
        'UPDATE carpools SET current_passengers = current_passengers - 1 WHERE id = $1 AND current_passengers > 1',
        [carpoolId]
      );
    } else {
      // If no rows were updated, the user wasn't an approved passenger
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approved passenger not found in this carpool.' });
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Passenger removed successfully.' });

    // Send email notification outside of the transaction
    sendEmail(
      removedUser.email,
      `You have been removed from the carpool: "${carpool.title}"`,
      `
        <p>Hi ${removedUser.display_name || 'there'},</p>
        <p>You have been removed from the carpool "<strong>${carpool.title}</strong>" by the carpool owner, <strong>${carpool.owner_name}</strong>.</p>
        <p>If you believe this was a mistake, you may want to contact the owner or find another ride on Cardipool.</p>
        <br/>
        <p>Thanks,<br/>The Cardipool Team</p>
      `
    ).catch(err => {
      console.error(`[Email] Failed to send removal notification to ${removedUser.email}:`, err);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing passenger:', error);
    res.status(500).json({ error: 'An internal error occurred.' });
  } finally {
    client.release();
  }
});


export default router; 