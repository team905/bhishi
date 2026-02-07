const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization
const db = require('./config/database');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bhishi', require('./routes/bhishi'));
app.use('/api/bidding', require('./routes/bidding'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/agreements', require('./routes/agreements'));
app.use('/api/verification', require('./routes/verification'));

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
    // Note: In serverless (Vercel), we'll use Vercel Cron Jobs instead of setInterval
    if (process.env.VERCEL) {
      // On Vercel, use cron jobs (configured in vercel.json)
      console.log('[Scheduler] Running on Vercel - using cron jobs for cycle closure');
      // Run once on cold start
      const { manuallyCloseExpiredCycles } = require('./routes/bidding');
      manuallyCloseExpiredCycles()
        .then(result => console.log(`[Scheduler] Initial check: ${result.message}`))
        .catch(err => console.error('[Scheduler] Initial check failed:', err));
    } else {
      // Traditional server - use setInterval
      const { closeBiddingCycle } = require('./routes/bidding');
      const { getDb } = require('./config/database');
      
      const checkAndCloseExpiredCycles = () => {
        const db = getDb();
        const now = new Date();
        const nowISO = now.toISOString();
        
        console.log(`[Scheduler] Checking for expired cycles at ${nowISO}...`);
        
        db.all(`
          SELECT id, group_id, bidding_end_date, status
          FROM bidding_cycles
          WHERE status = 'open'
        `, [], (err, allOpenCycles) => {
          if (err) {
            console.error('[Scheduler] Error fetching open cycles:', err);
            return;
          }

          if (allOpenCycles.length === 0) {
            return;
          }

          const cyclesToClose = allOpenCycles.filter(cycle => {
            const endDate = new Date(cycle.bidding_end_date);
            return endDate <= now;
          });

          if (cyclesToClose.length === 0) {
            return;
          }

          console.log(`[Scheduler] Found ${cyclesToClose.length} expired cycle(s) to close.`);

          cyclesToClose.forEach((cycle) => {
            closeBiddingCycle(cycle.id)
              .then((result) => {
                console.log(`[Scheduler] ✓ Successfully closed cycle ${cycle.id}`);
              })
              .catch((closeError) => {
                console.error(`[Scheduler] ✗ Failed to close cycle ${cycle.id}:`, closeError.message);
              });
          });
        });
      };
      
      checkAndCloseExpiredCycles();
      setTimeout(checkAndCloseExpiredCycles, 2000);
      setInterval(checkAndCloseExpiredCycles, 10000);
      console.log('[Scheduler] Automatic cycle closing scheduler started');
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
};

// For Vercel serverless, export the handler
if (process.env.VERCEL) {
  // Initialize on first request (cold start)
  let initPromise = null;
  
  app.use(async (req, res, next) => {
    if (!serverInitialized) {
      if (!initPromise) {
        initPromise = initializeServer();
      }
      await initPromise;
    }
    next();
  });
  
  module.exports = app;
} else {
  // Traditional server mode
  initializeServer().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;

