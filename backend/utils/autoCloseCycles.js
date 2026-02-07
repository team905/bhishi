const { getDb } = require('../config/database');
const { sendPaymentNotifications, sendWinnerNotification } = require('../services/notificationService');

/**
 * Automatically close bidding cycles that have passed their end time
 * This should be called periodically (e.g., every minute via cron job or setInterval)
 */
const autoCloseExpiredCycles = async () => {
  const db = getDb();
  const now = new Date().toISOString();

  // Find all open cycles that have passed their end time
  db.all(`
    SELECT bc.*, bg.id as group_id
    FROM bidding_cycles bc
    INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE bc.status = 'open' 
    AND bc.bidding_end_date <= ?
  `, [now], (err, expiredCycles) => {
    if (err) {
      console.error('Error fetching expired cycles:', err);
      return;
    }

    if (expiredCycles.length === 0) {
      return; // No expired cycles
    }

    console.log(`Found ${expiredCycles.length} expired bidding cycle(s) to close`);

    expiredCycles.forEach(cycle => {
      closeCycle(cycle);
    });
  });
};

/**
 * Close a single bidding cycle and determine winner
 */
const closeCycle = (cycle) => {
  const db = getDb();
  const cycleId = cycle.id;

  // Get all bids, lowest bid wins
  db.all('SELECT * FROM bids WHERE cycle_id = ? ORDER BY bid_amount ASC, bid_time ASC LIMIT 1', [cycleId], (err, bids) => {
    if (err) {
      console.error(`Error fetching bids for cycle ${cycleId}:`, err);
      return;
    }

    let winner;
    let winningBidAmount = null;
    let isRandomWinner = false;

    if (bids.length === 0) {
      // No bids placed - randomly select a winner from users who haven't won yet
      db.all(`
        SELECT gm.user_id
        FROM group_members gm
        WHERE gm.group_id = ?
        AND gm.user_id NOT IN (
          SELECT DISTINCT bc2.winner_user_id
          FROM bidding_cycles bc2
          WHERE bc2.group_id = ? 
          AND bc2.winner_user_id IS NOT NULL
          AND bc2.id != ?
        )
      `, [cycle.group_id, cycle.group_id, cycleId], (err, eligibleUsers) => {
        if (err) {
          console.error(`Error fetching eligible users for cycle ${cycleId}:`, err);
          return;
        }

        if (eligibleUsers.length === 0) {
          console.error(`No eligible users found for cycle ${cycleId} (all have already won)`);
          return;
        }

        // Randomly select a winner
        const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
        winner = eligibleUsers[randomIndex];
        isRandomWinner = true;
        winningBidAmount = cycle.total_pool_amount; // No bid, winner gets full amount

        // Update cycle
        db.run(
          'UPDATE bidding_cycles SET status = ?, winner_user_id = ?, winning_bid_amount = ?, is_random_winner = 1 WHERE id = ?',
          ['closed', winner.user_id, winningBidAmount, cycleId],
          function(err) {
            if (err) {
              console.error(`Error closing cycle ${cycleId}:`, err);
              return;
            }

            console.log(`Cycle ${cycleId} closed: Random winner selected (user ${winner.user_id})`);

            // No profit distribution when no bids - everyone pays full amount
            const originalContribution = cycle.total_pool_amount / cycle.total_members;
            
            // Update contributions with full payable amount (no reduction)
            db.all('SELECT user_id FROM group_members WHERE group_id = ?', [cycle.group_id], (err, allMembers) => {
              if (!err && allMembers.length > 0) {
                const contributionStmt = db.prepare('UPDATE contributions SET payable_amount = ? WHERE cycle_id = ? AND user_id = ?');
                allMembers.forEach(member => {
                  contributionStmt.run([originalContribution, cycleId, member.user_id]);
                });
                contributionStmt.finalize();

                // Send winner notification
                sendWinnerNotification(cycle.group_id, cycleId, winner.user_id, cycle.total_pool_amount, true);

                // Send notifications for full payment
                sendPaymentNotifications(cycle.group_id, cycleId, originalContribution, 0);
              }
            });
          }
        );
      });
      return;
    }

    // Bids were placed - lowest bid wins (user bids amount they want to receive)
    winner = bids[0];
    winningBidAmount = winner.bid_amount;

    // Profit = Total amount - Winning bid amount
    const profitAmount = cycle.total_pool_amount - winningBidAmount;

    // Update cycle
    db.run(
      'UPDATE bidding_cycles SET status = ?, winner_user_id = ?, winning_bid_amount = ?, is_random_winner = 0 WHERE id = ?',
      ['closed', winner.user_id, winningBidAmount, cycleId],
      function(err) {
        if (err) {
          console.error(`Error closing cycle ${cycleId}:`, err);
          return;
        }

        console.log(`Cycle ${cycleId} closed: Winner is user ${winner.user_id} with bid ₹${winningBidAmount}`);

        // Get ALL group members for profit distribution (including winner)
        db.all(`
          SELECT gm.user_id
          FROM group_members gm
          WHERE gm.group_id = ?
        `, [cycle.group_id], (err, allMembers) => {
          if (err) {
            console.error(`Error fetching members for cycle ${cycleId}:`, err);
            return;
          }

          if (allMembers.length > 0 && profitAmount > 0) {
            // Calculate profit per user (equal distribution among ALL members)
            const profitPerUser = profitAmount / allMembers.length;

            // Create profit distribution records for all members
            const profitStmt = db.prepare('INSERT INTO profit_distributions (cycle_id, user_id, profit_amount, distribution_status) VALUES (?, ?, ?, ?)');
            allMembers.forEach(member => {
              profitStmt.run([cycleId, member.user_id, profitPerUser, 'distributed']);
            });
            profitStmt.finalize();

            // Calculate reduced payable amount for contributions
            const originalContribution = cycle.total_pool_amount / allMembers.length;
            const reducedPayableAmount = originalContribution - profitPerUser;

            // Update contributions with reduced payable amount
            const contributionStmt = db.prepare('UPDATE contributions SET payable_amount = ? WHERE cycle_id = ? AND user_id = ?');
            allMembers.forEach(member => {
              contributionStmt.run([reducedPayableAmount, cycleId, member.user_id]);
            });
            contributionStmt.finalize();

            // Send winner notification
            sendWinnerNotification(cycle.group_id, cycleId, winner.user_id, winningBidAmount, false);

            // Send notifications to all members
            sendPaymentNotifications(cycle.group_id, cycleId, reducedPayableAmount, profitPerUser);
          }
        });
      }
    );
  });
};

module.exports = {
  autoCloseExpiredCycles,
  closeCycle
};

