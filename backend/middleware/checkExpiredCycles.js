// Middleware to check and close expired cycles on API calls
// Runs asynchronously so it doesn't block the main request
// Works alongside the setInterval scheduler in server.js

const { manuallyCloseExpiredCycles } = require('../routes/bidding');

let lastCheckTime = 0;
const CHECK_INTERVAL = 10000; // Check at most once every 10 seconds

const checkExpiredCycles = async (req, res, next) => {
  // Run check asynchronously (don't block the request)
  setImmediate(async () => {
    const now = Date.now();
    
    // Only check if enough time has passed since last check
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return; // Skip if checked recently
    }
    
    lastCheckTime = now;
    
    try {
      const result = await manuallyCloseExpiredCycles();
      if (result.closed > 0) {
        console.log(`[Auto-Close] Closed ${result.closed} expired cycle(s) via API trigger`);
      }
    } catch (error) {
      // Don't log errors to avoid spam, but don't fail the request
      console.error('[Auto-Close] Error checking expired cycles:', error.message);
    }
  });
  
  // Continue with the original request immediately
  next();
};

module.exports = checkExpiredCycles;

