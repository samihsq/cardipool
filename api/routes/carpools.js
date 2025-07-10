import { Router } from 'express';
import pool from '../db.js';

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
      ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder} NULLS LAST
    `;
    
    const result = await pool.query(finalQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET carpools created by or joined by the current user
router.get('/mine', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT 
        c.*, 
        u.display_name as creator_name,
        u.sunet_id as creator_sunet_id,
        (c.created_by = $1) as is_owner,
        array_agg(
          CASE WHEN ct.id IS NOT NULL 
          THEN json_build_object('id', ct.id, 'name', ct.name, 'color', ct.color)
          ELSE NULL END
        ) FILTER (WHERE ct.id IS NOT NULL) as tag_details
      FROM carpools c
      LEFT JOIN users u ON c.created_by = u.id 
      LEFT JOIN carpool_tags ct ON ct.id = ANY(c.tags)
      LEFT JOIN join_requests jr ON c.id = jr.carpool_id
      WHERE c.created_by = $1 OR (jr.user_id = $1 AND jr.status = 'approved')
      GROUP BY c.id, u.display_name, u.sunet_id
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
router.post('/', async (req, res) => {
  try {
    const { 
      title, description, contact, departure_date, 
      departure_time, capacity, tags, carpool_type,
      event_name, pickup_details, dropoff_details
    } = req.body;
    
    if (!title || !contact || !departure_date || !departure_time || !capacity) {
      return res.status(400).json({ error: 'Title, contact, departure date/time, and capacity are required' });
    }
    
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO carpools 
        (title, description, contact, departure_date, departure_time, capacity, tags, created_by, carpool_type, event_name, pickup_details, dropoff_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, description, contact, departure_date, departure_time, capacity, tags || [], userId, carpool_type, event_name, pickup_details, dropoff_details]
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, description, contact, departure_date, 
      departure_time, capacity, tags, carpool_type,
      event_name, pickup_details, dropoff_details
    } = req.body;
    const userId = req.user.id;

    const existingCarpool = await pool.query('SELECT * FROM carpools WHERE id = $1 AND created_by = $2', [id, userId]);
    if (existingCarpool.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found or you do not have permission to edit it.' });
    }

    const result = await pool.query(
      `UPDATE carpools 
       SET title = $1, description = $2, contact = $3, departure_date = $4, 
           departure_time = $5, capacity = $6, tags = $7, carpool_type = $8,
           event_name = $9, pickup_details = $10, dropoff_details = $11, updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [title, description, contact, departure_date, departure_time, capacity, tags, carpool_type, event_name, pickup_details, dropoff_details, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE carpool
router.delete('/:id', async (req, res) => {
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

// REQUEST TO JOIN a carpool
router.post('/:id/join', async (req, res) => {
  try {
    const { id: carpool_id } = req.params;
    const user_id = req.user.id;
    const { message } = req.body;

    const carpool = await pool.query('SELECT * FROM carpools WHERE id = $1', [carpool_id]);
    if (carpool.rows.length === 0) {
      return res.status(404).json({ error: 'Carpool not found' });
    }

    if (carpool.rows[0].created_by === user_id) {
        return res.status(400).json({ error: "You can't join your own carpool" });
    }

    if (carpool.rows[0].current_passengers >= carpool.rows[0].capacity) {
        return res.status(400).json({ error: "This carpool is already full" });
    }

    const result = await pool.query(
      `INSERT INTO join_requests (carpool_id, user_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (carpool_id, user_id) DO UPDATE SET message = EXCLUDED.message, status = 'pending', updated_at = NOW()
       RETURNING *`,
      [carpool_id, user_id, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
        return res.status(409).json({ error: "You've already sent a request to join this carpool." });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET join requests for a specific carpool (creator only)
router.get('/:id/requests', async (req, res) => {
    try {
        const { id: carpool_id } = req.params;
        const user_id = req.user.id;

        const carpool = await pool.query('SELECT created_by FROM carpools WHERE id = $1', [carpool_id]);
        if (carpool.rows.length === 0) {
            return res.status(404).json({ error: 'Carpool not found' });
        }
        if (carpool.rows[0].created_by !== user_id) {
            return res.status(403).json({ error: 'You are not authorized to view requests for this carpool' });
        }

        const result = await pool.query(
            `SELECT jr.*, u.display_name, u.sunet_id, u.email
             FROM join_requests jr
             JOIN users u ON jr.user_id = u.id
             WHERE jr.carpool_id = $1
             ORDER BY jr.created_at DESC`,
            [carpool_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE join request status (approve/reject)
router.put('/requests/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        const user_id = req.user.id;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'." });
        }

        const requestQuery = await pool.query(
            `SELECT jr.*, c.created_by, c.capacity, c.current_passengers
             FROM join_requests jr
             JOIN carpools c ON jr.carpool_id = c.id
             WHERE jr.id = $1`,
            [requestId]
        );

        if (requestQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        const { carpool_id, created_by, capacity, current_passengers } = requestQuery.rows[0];

        if (created_by !== user_id) {
            return res.status(403).json({ error: 'You are not authorized to manage this request' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (status === 'approved') {
                if (current_passengers >= capacity) {
                    throw new Error('Carpool is full');
                }
                await client.query('UPDATE carpools SET current_passengers = current_passengers + 1 WHERE id = $1', [carpool_id]);
            }

            const updatedRequest = await client.query(
                `UPDATE join_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [status, requestId]
            );

            await client.query('COMMIT');
            res.json(updatedRequest.rows[0]);

        } catch (e) {
            await client.query('ROLLBACK');
            if (e.message === 'Carpool is full') {
                return res.status(409).json({ error: 'Cannot approve, the carpool is now full.' });
            }
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router; 