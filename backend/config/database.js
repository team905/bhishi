// Database configuration router
// This file NEVER contains sqlite3 code - it only routes to the correct implementation

// Check environment FIRST - before any other code execution
const hasPostgresUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
const isVercel = !!process.env.VERCEL;

if (hasPostgresUrl || isVercel) {
  // PostgreSQL mode - delegate immediately
  // This prevents ANY sqlite3 code from being parsed
  module.exports = require('./database-postgres');
} else {
  // SQLite mode - only for local development
  // Load sqlite implementation (which will require sqlite3)
  module.exports = require('./database-sqlite');
}
