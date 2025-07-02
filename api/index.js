import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import pool from './db.js';
import carpoolRouter from './routes/carpools.js';

dotenv.config();

const app = express();

// Configure CORS for Vercel
const corsOptions = {
  origin: process.env.VERCEL_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/carpools', carpoolRouter);

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export the Express API
export default app; 