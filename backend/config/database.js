// Database configuration router
// Automatically switches between Firestore local (emulator) and Firestore production
// 
// Local Development: Uses Firestore Emulator when FIREBASE_USE_EMULATOR=true
// Production: Uses Firebase Cloud when FIREBASE_USE_EMULATOR is not set

// Check for Firebase configuration
const useEmulator = process.env.FIREBASE_USE_EMULATOR === 'true' || process.env.NODE_ENV !== 'production';

if (useEmulator) {
  // Local development mode - use Firestore Emulator
  console.log('[Database] Using Firestore Emulator (local development mode)');
  module.exports = require('./database-firestore');
} else {
  // Production mode - use Firebase Cloud
  console.log('[Database] Using Firestore Cloud (production mode)');
  module.exports = require('./database-firestore');
}
