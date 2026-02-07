// Vercel Cron Job to close expired bidding cycles
// Runs every minute
const db = require('../../backend/config/database');
const { manuallyCloseExpiredCycles } = require('../../backend/routes/bidding');

let dbInitialized = false;

module.exports = async (req, res) => {
  // Verify it's a cron job request
  // Vercel sends the cron secret in the Authorization header
  const authHeader = req.headers['authorization'] || req.headers['x-vercel-cron-secret'];
  const cronSecret = process.env.CRON_SECRET;
  
  // Only check if CRON_SECRET is set (optional security)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize database if needed
    if (!dbInitialized) {
      await db.initDatabase();
      dbInitialized = true;
    }

    console.log('[Cron] Running cycle closure check...');
    const result = await manuallyCloseExpiredCycles();
    console.log('[Cron] Result:', result);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Cron] Error:', error);
    res.status(500).json({ error: error.message });
  }
};
