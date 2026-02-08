// Vercel serverless function - Main API entry point
// This wraps the Express app for Vercel's serverless environment

// Set VERCEL environment variable
process.env.VERCEL = '1';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization
let db = null;
let dbInitialized = false;
let initPromise = null;

const initDb = async () => {
  if (!dbInitialized) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          // Check if DATABASE_URL is set
          const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
          if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not set. Please configure your database in Vercel project settings.');
          }

          // Load database module
          db = require('../backend/config/database');
          
          // Initialize database
          await db.initDatabase();
          dbInitialized = true;
          console.log('[Vercel] Database initialized successfully');
        } catch (error) {
          console.error('[Vercel] Database initialization error:', error);
          console.error('[Vercel] Error stack:', error.stack);
          throw error;
        }
      })();
    }
    await initPromise;
  }
};

// Initialize database before handling requests
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (error) {
    console.error('[Vercel] Database init error in middleware:', error.message);
    return res.status(500).json({ 
      error: 'Database initialization failed',
      message: error.message,
      hint: 'Please ensure DATABASE_URL is set in your Vercel environment variables'
    });
  }
});

// Auto-close expired cycles middleware
const checkExpiredCycles = require('../backend/middleware/checkExpiredCycles');

// Routes - Note: Vercel rewrites /api/* to this function, so routes should NOT include /api prefix
app.use('/auth', require('../backend/routes/auth'));
app.use('/admin', checkExpiredCycles, require('../backend/routes/admin'));
app.use('/users', checkExpiredCycles, require('../backend/routes/users'));
app.use('/bhishi', checkExpiredCycles, require('../backend/routes/bhishi'));
app.use('/bidding', checkExpiredCycles, require('../backend/routes/bidding'));
app.use('/disputes', checkExpiredCycles, require('../backend/routes/disputes'));
app.use('/agreements', checkExpiredCycles, require('../backend/routes/agreements'));
app.use('/verification', checkExpiredCycles, require('../backend/routes/verification'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bhishi Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Vercel] Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export for Vercel
module.exports = app;
