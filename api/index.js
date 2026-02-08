// Vercel serverless function - Main API entry point
console.log('[Vercel] Function starting...');

// Set VERCEL environment variable
process.env.VERCEL = '1';

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check - test this first
app.get('/health', (req, res) => {
  console.log('[Vercel] Health check called');
  res.json({ status: 'ok', message: 'Bhishi Management System API' });
});

// Simple test route
app.get('/test', (req, res) => {
  console.log('[Vercel] Test route called');
  res.json({ message: 'Serverless function is working!' });
});

// Initialize database and routes only after health check works
let routesInitialized = false;

const initializeRoutes = async () => {
  if (routesInitialized) return;
  
  try {
    console.log('[Vercel] Initializing database...');
    const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('[Vercel] DATABASE_URL not set');
      throw new Error('DATABASE_URL not configured');
    }
    
    console.log('[Vercel] DATABASE_URL found, loading database module...');
    const db = require('../backend/config/database');
    
    console.log('[Vercel] Initializing database...');
    await db.initDatabase();
    console.log('[Vercel] Database initialized successfully');
    
    // Load middleware
    const checkExpiredCycles = require('../backend/middleware/checkExpiredCycles');
    
    // Load routes
    console.log('[Vercel] Loading routes...');
    app.use('/auth', require('../backend/routes/auth'));
    app.use('/admin', checkExpiredCycles, require('../backend/routes/admin'));
    app.use('/users', checkExpiredCycles, require('../backend/routes/users'));
    app.use('/bhishi', checkExpiredCycles, require('../backend/routes/bhishi'));
    app.use('/bidding', checkExpiredCycles, require('../backend/routes/bidding'));
    app.use('/disputes', checkExpiredCycles, require('../backend/routes/disputes'));
    app.use('/agreements', checkExpiredCycles, require('../backend/routes/agreements'));
    app.use('/verification', checkExpiredCycles, require('../backend/routes/verification'));
    
    routesInitialized = true;
    console.log('[Vercel] All routes loaded successfully');
  } catch (error) {
    console.error('[Vercel] Error initializing routes:', error);
    console.error('[Vercel] Error stack:', error.stack);
    
    // Add error route
    app.use((req, res) => {
      res.status(500).json({
        error: 'Server initialization failed',
        message: error.message,
        hint: 'Check Vercel logs for details'
      });
    });
  }
};

// Initialize routes on first request (lazy loading)
app.use(async (req, res, next) => {
  if (!routesInitialized && req.path !== '/health' && req.path !== '/test') {
    await initializeRoutes();
  }
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Vercel] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

console.log('[Vercel] Function exported');
module.exports = app;
