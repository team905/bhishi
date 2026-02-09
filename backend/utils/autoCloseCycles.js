const { closeBiddingCycle } = require('../routes/bidding');

/**
 * Automatically close bidding cycles that have passed their end time
 * This should be called periodically (e.g., every minute via cron job or setInterval)
 */
const autoCloseExpiredCycles = async () => {
  try {
    const { db } = require('../config/database');
    const now = new Date();

    // Find all open cycles
    const allOpenCycles = await db.getAll('bidding_cycles', [
      { field: 'status', operator: '==', value: 'open' }
    ]);

    // Filter cycles that have expired
    const expiredCycles = allOpenCycles.filter(cycle => {
      const endDate = new Date(cycle.bidding_end_date);
      return endDate <= now;
    });

    if (expiredCycles.length === 0) {
      return; // No expired cycles
    }

    console.log(`Found ${expiredCycles.length} expired bidding cycle(s) to close`);

    // Close each cycle
    for (const cycle of expiredCycles) {
      try {
        await closeBiddingCycle(cycle.id);
      } catch (error) {
        console.error(`Error closing cycle ${cycle.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in autoCloseExpiredCycles:', error);
  }
};

module.exports = {
  autoCloseExpiredCycles
};
