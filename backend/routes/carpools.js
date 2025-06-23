import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET all carpools
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carpools ORDER BY id DESC');
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
    const result = await pool.query('SELECT * FROM carpools WHERE id = $1', [id]);
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
    const { title, tags, contact, description } = req.body;
    if (!title || !contact) {
      return res.status(400).json({ error: 'title and contact required' });
    }
    const result = await pool.query(
      `INSERT INTO carpools (title, tags, contact, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, tags, contact, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 