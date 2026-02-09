const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auto-close expired cycles on API calls
const checkExpiredCycles = require('./middleware/checkExpiredCycles');

// Database initialization
const db = require('./config/database');

// Routes with auto-close expired cycles check
// This ensures cycles are closed when users interact with the app
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', checkExpiredCycles, require('./routes/admin'));
app.use('/api/users', checkExpiredCycles, require('./routes/users'));
app.use('/api/bhishi', checkExpiredCycles, require('./routes/bhishi'));
app.use('/api/bidding', checkExpiredCycles, require('./routes/bidding'));
app.use('/api/disputes', checkExpiredCycles, require('./routes/disputes'));
app.use('/api/agreements', checkExpiredCycles, require('./routes/agreements'));
app.use('/api/verification', checkExpiredCycles, require('./routes/verification'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bhishi Management System API' });
});

const PORT = process.env.PORT || 5005;

// Initialize database
let serverInitialized = false;

const initializeServer = async () => {
  if (serverInitialized) return;
  
  try {
    await db.initDatabase();
    serverInitialized = true;
    console.log('Database initialized successfully');
    
    // Set up automatic cycle closing scheduler
    // Use the existing manuallyCloseExpiredCycles function which works with both SQLite and PostgreSQL
    const { manuallyCloseExpiredCycles } = require('./routes/bidding');
    
    const checkAndCloseExpiredCycles = async () => {
      try {
        const result = await manuallyCloseExpiredCycles();
        if (result.closed > 0) {
          console.log(`[Scheduler] Closed ${result.closed} expired cycle(s)`);
        }
      } catch (error) {
        console.error('[Scheduler] Error checking expired cycles:', error.message);
      }
    };
    
    // Run immediately, then every 10 seconds
    checkAndCloseExpiredCycles();
    setTimeout(checkAndCloseExpiredCycles, 2000);
    setInterval(checkAndCloseExpiredCycles, 10000);
    console.log('[Scheduler] Automatic cycle closing scheduler started (checks every 10 seconds)');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
};

// Initialize and start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (production)' : 'SQLite (local)'}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;

