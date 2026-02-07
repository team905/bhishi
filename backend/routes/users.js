const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get user's groups
router.get('/groups', (req, res) => {
  const db = getDb();
  db.all(`
    SELECT 
      bg.*,
      COUNT(DISTINCT gm.user_id) as current_members
    FROM bhishi_groups bg
    INNER JOIN group_members gm ON bg.id = gm.group_id
    WHERE gm.user_id = ?
    GROUP BY bg.id
    ORDER BY bg.created_at DESC
  `, [req.user.id], (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(groups);
  });
});

// Get user dashboard data
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  // Get user's groups
  db.all(`
    SELECT 
      bg.*, 
      COUNT(DISTINCT gm2.user_id) as current_members,
      (SELECT COUNT(DISTINCT bc.winner_user_id)
       FROM bidding_cycles bc
       WHERE bc.group_id = bg.id AND bc.winner_user_id IS NOT NULL AND bc.admin_approved = 1) as winners_count
    FROM bhishi_groups bg
    INNER JOIN group_members gm ON bg.id = gm.group_id
    LEFT JOIN group_members gm2 ON bg.id = gm2.group_id
    WHERE gm.user_id = ?
    GROUP BY bg.id
  `, [userId], (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get active bidding cycles for user's groups
    const groupIds = groups.map(g => g.id);
    const placeholders = groupIds.length > 0 ? groupIds.map(() => '?').join(',') : '';
    
    // Get active cycles (even if no groups, we still need to fetch contributions)
    const activeCyclesQuery = groupIds.length > 0 ? `
      SELECT bc.*, bg.name as group_name
      FROM bidding_cycles bc
      INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
      WHERE bc.group_id IN (${placeholders}) AND bc.status = 'open'
      ORDER BY bc.bidding_end_date ASC
    ` : 'SELECT NULL as id WHERE 1=0'; // Empty result if no groups
    
    db.all(activeCyclesQuery, groupIds.length > 0 ? groupIds : [], (err, activeCycles) => {
      if (err) {
        console.error('[Dashboard] Error fetching active cycles:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get user's bids (even if no active cycles)
      const cycleIds = activeCycles.map(c => c.id);
      const myBidsQuery = cycleIds.length > 0 ? `
        SELECT b.*, bc.cycle_number, bg.name as group_name
        FROM bids b
        INNER JOIN bidding_cycles bc ON b.cycle_id = bc.id
        INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
        WHERE b.user_id = ? AND b.cycle_id IN (${cycleIds.map(() => '?').join(',')})
      ` : 'SELECT NULL as id WHERE 1=0'; // Empty result if no cycles

      db.all(myBidsQuery, cycleIds.length > 0 ? [userId, ...cycleIds] : [], (err, myBids) => {
        if (err) {
          console.error('[Dashboard] Error fetching bids:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get user's contributions (ALWAYS fetch this, regardless of active cycles)
        // Also need to handle case where user has no groups but might have contributions from deleted groups
        const contributionsQuery = `
          SELECT 
            c.*, 
            bc.id as cycle_id,
            bc.cycle_number, 
            bg.name as group_name,
            bc.status as cycle_status,
            bc.winner_user_id,
            CASE WHEN bc.winner_user_id = ? THEN 1 ELSE 0 END as is_winner,
            COALESCE(c.payable_amount, c.amount) as payable_amount,
            (c.amount - COALESCE(c.payable_amount, c.amount)) as earned_profit
          FROM contributions c
          INNER JOIN bidding_cycles bc ON c.cycle_id = bc.id
          INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
          WHERE c.user_id = ? AND bc.status IN ('open', 'closed')
          ORDER BY bc.created_at DESC
        `;
        
        db.all(contributionsQuery, [userId, userId], (err, contributions) => {
          if (err) {
            console.error('[Dashboard] Error fetching contributions:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          console.log(`[Dashboard] User ${userId} - Found ${contributions.length} contributions`);

          // Calculate financial summary
          // Total contributions = sum of all original amounts contributed
          const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
          console.log(`[Dashboard] Total contributions: ₹${totalContributions}`);
          
          // Total amount due = sum of payable_amount for pending contributions
          const pendingContribs = contributions.filter(c => c.payment_status === 'pending');
          const totalAmountDue = pendingContribs.reduce((sum, c) => sum + parseFloat(c.payable_amount || c.amount || 0), 0);
          console.log(`[Dashboard] Total amount due: ₹${totalAmountDue} (${pendingContribs.length} pending)`);
          
          // Get profit distributions (earnings)
          db.all(`
            SELECT pd.*, bc.cycle_number, bg.name as group_name
            FROM profit_distributions pd
            INNER JOIN bidding_cycles bc ON pd.cycle_id = bc.id
            INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
            WHERE pd.user_id = ?
            ORDER BY pd.created_at DESC
          `, [userId], (err, profitDistributions) => {
            if (err) {
              console.error('[Dashboard] Error fetching profit distributions:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            const totalEarnings = profitDistributions.reduce((sum, p) => sum + parseFloat(p.profit_amount || 0), 0);
            console.log(`[Dashboard] Total earnings: ₹${totalEarnings} (${profitDistributions.length} distributions)`);

            // Get winnings (payouts received)
            db.all(`
              SELECT 
                bc.id as cycle_id,
                bc.cycle_number,
                bc.group_id,
                bg.name as group_name,
                bc.total_pool_amount,
                bc.winning_bid_amount,
                bc.winning_bid_amount as payout_amount,
                bc.payout_date,
                bc.admin_approved
              FROM bidding_cycles bc
              INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
              WHERE bc.winner_user_id = ? AND bc.status = 'closed'
              ORDER BY bc.created_at DESC
            `, [userId], (err, winnings) => {
              if (err) {
                console.error('[Dashboard] Error fetching winnings:', err);
                return res.status(500).json({ error: 'Database error' });
              }

              const totalWinnings = winnings
                .filter(w => w.admin_approved)
                .reduce((sum, w) => sum + parseFloat(w.payout_amount || 0), 0);

              // Check if user has won in any group (regardless of approval status)
              const hasWon = winnings.length > 0;
              
              console.log(`[Dashboard] Winnings: ${winnings.length} cycles, Total approved: ₹${totalWinnings}, HasWon: ${hasWon}`);

              // Get groups where user has won
              const groupsWon = new Set(winnings.map(w => w.group_id));

              const netAmount = totalEarnings + totalWinnings - totalContributions;
              console.log(`[Dashboard] Financial Summary - Contributions: ₹${totalContributions}, Earnings: ₹${totalEarnings}, Winnings: ₹${totalWinnings}, Net: ₹${netAmount}`);

              const financialSummary = {
                totalContributions,
                totalEarnings: totalEarnings,
                totalWinnings: totalWinnings,
                netAmount: netAmount,
                totalAmountDue,
                hasWon,
                groupsWon: Array.from(groupsWon)
              };

              console.log(`[Dashboard] Sending financial summary:`, JSON.stringify(financialSummary, null, 2));

              res.json({
                groups,
                activeCycles,
                myBids,
                contributions,
                financialSummary,
                profitDistributions,
                winnings
              });
            });
          });
        });
      });
    });
  });
});

// Get user notifications
router.get('/notifications', (req, res) => {
  const db = getDb();
  const { unreadOnly } = req.query;

  let query = `
    SELECT 
      n.*,
      bc.cycle_number,
      bg.name as group_name
    FROM notifications n
    LEFT JOIN bidding_cycles bc ON n.cycle_id = bc.id
    LEFT JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE n.user_id = ?
  `;

  if (unreadOnly === 'true') {
    query += ' AND n.is_read = 0';
  }

  query += ' ORDER BY n.created_at DESC LIMIT 50';

  db.all(query, [req.user.id], (err, notifications) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(notifications);
  });
});

// Mark notification as read
router.put('/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json({ message: 'Notification marked as read' });
    }
  );
});

module.exports = router;

