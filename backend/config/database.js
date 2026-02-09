// Database configuration router
// Automatically switches between SQLite (local) and PostgreSQL (production)
// 
// Local Development: Uses SQLite when DATABASE_URL is not set
// Production (Railway): Uses PostgreSQL when DATABASE_URL is set

// Check for PostgreSQL connection string
// Railway provides DATABASE_URL automatically when you add a PostgreSQL service
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Debug logging to help identify issues
console.log('[Database Config] Checking environment variables...');
console.log('[Database Config] DATABASE_URL:', process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');
console.log('[Database Config] POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
console.log('[Database Config] NODE_ENV:', process.env.NODE_ENV || 'not set');

if (databaseUrl) {
  // Production mode - use PostgreSQL (Railway, Heroku, etc.)
  console.log('[Database] Using PostgreSQL (production mode)');
  console.log('[Database] Connection string detected, routing to PostgreSQL module');
  module.exports = require('./database-postgres');
} else {
  // Local development mode - use SQLite
  console.log('[Database] Using SQLite (local development mode)');
  console.log('[Database] WARNING: DATABASE_URL not set - using SQLite');
  console.log('[Database] If this is production, make sure DATABASE_URL is set in Railway!');
  module.exports = require('./database-sqlite');
}
