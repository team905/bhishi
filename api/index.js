// Vercel serverless function - Main API entry point
// This wraps the Express app for Vercel's serverless environment

const db = require('../backend/config/database');
let dbInitialized = false;
let initPromise = null;

const initDb = async () => {
  if (!dbInitialized) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await db.initDatabase();
          dbInitialized = true;
          console.log('Database initialized for serverless function');
        } catch (error) {
          console.error('Database initialization error:', error);
          throw error;
        }
      })();
    }
    await initPromise;
  }
};

// Import Express app
const app = require('../backend/server');

// Initialize database before handling requests (only once, even with concurrent requests)
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (error) {
    console.error('Database init error in middleware:', error);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// Export for Vercel
module.exports = app;
