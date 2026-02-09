const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    process.env.FRONTEND_URL, // Production frontend URL
    /\.web\.app$/, // Firebase Hosting domains
    /\.firebaseapp\.com$/ // Firebase Hosting alternate domains
  ].filter(Boolean),
  credentials: true
}));
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

// Note: Database now uses Firestore (Firebase)
// Local: Uses Firebase Emulator (set FIREBASE_USE_EMULATOR=true)
// Production: Uses Firebase Cloud (set FIREBASE_SERVICE_ACCOUNT_KEY)

// Initialize database and start server
db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Set up automatic cycle closing - check every 10 seconds for immediate processing
    const { closeBiddingCycle } = require('./routes/bidding');
    const { db } = require('./config/database');
    
    // Function to check and close expired cycles
    const checkAndCloseExpiredCycles = async () => {
      try {
        const now = new Date();
        const nowISO = now.toISOString();
        const nowLocal = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        
        console.log(`[Scheduler] Checking for expired cycles at ${nowISO} (local: ${nowLocal})...`);
        
        // Get all open cycles
        const allOpenCycles = await db.getAll('bidding_cycles', [
          { field: 'status', operator: '==', value: 'open' }
        ]);

        if (allOpenCycles.length === 0) {
          return; // No open cycles
        }

        console.log(`[Scheduler] Found ${allOpenCycles.length} open cycle(s). Checking expiration...`);

        // Filter cycles that have expired by comparing dates
        const cyclesToClose = allOpenCycles.filter(cycle => {
          const endDate = new Date(cycle.bidding_end_date);
          const hasExpired = endDate <= now;
          if (hasExpired) {
            console.log(`[Scheduler] Cycle ${cycle.id} has expired (end: ${cycle.bidding_end_date}, now: ${nowISO})`);
          }
          return hasExpired;
        });

        if (cyclesToClose.length === 0) {
          return; // No expired cycles
        }

        console.log(`[Scheduler] Found ${cyclesToClose.length} expired cycle(s) to close. Processing immediately...`);

        // Process all cycles sequentially to avoid race conditions
        let processed = 0;
        for (const cycle of cyclesToClose) {
          try {
            console.log(`[Scheduler] Attempting to close cycle ${cycle.id} (ended at ${cycle.bidding_end_date})...`);
            const result = await closeBiddingCycle(cycle.id);
            processed++;
            console.log(`[Scheduler] ✓ Successfully closed cycle ${cycle.id}:`, result.message);
            if (result.winner) {
              console.log(`[Scheduler]   Winner: User ${result.winner.userId}, Bid: ₹${result.winner.bidAmount}`);
            }
          } catch (closeError) {
            processed++;
            console.error(`[Scheduler] ✗ Failed to close cycle ${cycle.id}:`, closeError.message);
            console.error(`[Scheduler] Full error:`, closeError);
            if (closeError.stack) {
              console.error(`[Scheduler] Stack trace:`, closeError.stack);
            }
          }
        }
        
        if (processed === cyclesToClose.length) {
          console.log(`[Scheduler] All ${cyclesToClose.length} cycle(s) processed`);
        }
      } catch (error) {
        console.error('[Scheduler] Error checking expired cycles:', error);
      }
    };
    
    // Run immediately on server start to catch any cycles that expired while server was down
    console.log('[Scheduler] Checking for expired cycles on server start...');
    // Run immediately, then again after 2 seconds to ensure it catches everything
    checkAndCloseExpiredCycles();
    setTimeout(() => {
      checkAndCloseExpiredCycles();
    }, 2000); // Also check after 2 seconds for database to be fully ready
    
    // Then check every 10 seconds
    setInterval(checkAndCloseExpiredCycles, 10000);
    
    console.log('[Scheduler] Automatic cycle closing scheduler started (checks every 10 seconds)');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;

