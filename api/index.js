// Vercel serverless function - Main API entry point
// This wraps the Express app for Vercel's serverless environment

// Set VERCEL environment variable
process.env.VERCEL = '1';

// Log startup
console.log('[Vercel] Starting serverless function...');
console.log('[Vercel] NODE_PATH:', process.env.NODE_PATH);
console.log('[Vercel] __dirname:', __dirname);

// Add error handling for missing modules
let express, cors;
try {
  express = require('express');
  cors = require('cors');
  require('dotenv').config();
  console.log('[Vercel] Core dependencies loaded successfully');
} catch (error) {
  console.error('[Vercel] Failed to load core dependencies:', error);
  console.error('[Vercel] Error details:', error.message, error.stack);
  // Export a simple error handler
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Server configuration error',
      message: error.message,
      hint: 'Dependencies may not be installed. Check Vercel build logs.'
    });
  };
  throw error;
}

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
    // Verify database is accessible
    const { getDb } = require('../backend/config/database');
    try {
      const testDb = getDb();
      if (!testDb) {
        throw new Error('Database object is null');
      }
    } catch (dbError) {
      console.error('[Vercel] Database verification failed:', dbError);
      return res.status(500).json({ 
        error: 'Database not accessible',
        message: dbError.message,
        hint: 'Database initialized but getDb() failed'
      });
    }
    next();
  } catch (error) {
    console.error('[Vercel] Database init error in middleware:', error.message);
    console.error('[Vercel] Full error:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed',
      message: error.message,
      hint: 'Please ensure DATABASE_URL is set in your Vercel environment variables',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Auto-close expired cycles middleware
let checkExpiredCycles;
try {
  checkExpiredCycles = require('../backend/middleware/checkExpiredCycles');
} catch (error) {
  console.error('[Vercel] Failed to load checkExpiredCycles middleware:', error);
  // Create a no-op middleware if it fails to load
  checkExpiredCycles = (req, res, next) => next();
}

// Routes - Note: Vercel rewrites /api/* to this function, so routes should NOT include /api prefix
// Load routes after database is initialized
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
