import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET all available tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, color
      FROM carpool_tags 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create new tag (admin only for now)
router.post('/', async (req, res) => {
  try {
    const { name, color = '#8C1515' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO carpool_tags (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Tag name already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

export default router; 