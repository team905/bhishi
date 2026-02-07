const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendPaymentNotifications, sendWinnerNotification } = require('../services/notificationService');

const router = express.Router();

router.use(authenticate);

// Get active bidding cycles for user's groups
router.get('/cycles', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  // Get user's groups (excluding completed groups)
  db.all('SELECT group_id FROM group_members WHERE user_id = ?', [userId], (err, userGroups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (userGroups.length === 0) {
      return res.json([]);
    }

    const groupIds = userGroups.map(g => g.group_id);
    const placeholders = groupIds.map(() => '?').join(',');

    db.all(`
      SELECT 
        bc.*,
        bg.name as group_name,
        bg.contribution_amount,
        bg.status as group_status,
        bg.max_bid_reduction_percentage,
        (bc.total_pool_amount * (1 - COALESCE(bg.max_bid_reduction_percentage, 40) / 100)) as min_bid_amount,
        COUNT(DISTINCT b.id) as bid_count,
        MIN(b.bid_amount) as lowest_bid,
        MAX(b.bid_amount) as highest_bid
      FROM bidding_cycles bc
      INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
      LEFT JOIN bids b ON bc.id = b.cycle_id
      WHERE bc.group_id IN (${placeholders}) AND bc.status = 'open' AND bg.status != 'completed'
      GROUP BY bc.id
      ORDER BY bc.bidding_end_date ASC
    `, groupIds, (err, cycles) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get user's bids for these cycles
      const cycleIds = cycles.map(c => c.id);
      if (cycleIds.length === 0) {
        return res.json(cycles.map(c => ({ ...c, myBid: null, hasWonBefore: false })));
      }

      const cyclePlaceholders = cycleIds.map(() => '?').join(',');

      // Check if user has won in previous cycles of these groups
      const winPlaceholders = groupIds.map(() => '?').join(',');
      const cyclePlaceholders2 = cycleIds.map(() => '?').join(',');
      db.all(`
        SELECT DISTINCT bc.group_id
        FROM bidding_cycles bc
        WHERE bc.group_id IN (${winPlaceholders})
        AND bc.winner_user_id = ?
        AND bc.status = 'closed'
        AND bc.id NOT IN (${cyclePlaceholders2})
      `, [...groupIds, userId, ...cycleIds], (err, previousWins) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const wonGroups = new Set(previousWins.map(w => w.group_id));

        db.all(`
          SELECT cycle_id, bid_amount, bid_time
          FROM bids
          WHERE user_id = ? AND cycle_id IN (${cyclePlaceholders})
        `, [userId, ...cycleIds], (err, myBids) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const bidsMap = {};
          myBids.forEach(bid => {
            bidsMap[bid.cycle_id] = bid;
          });

          const cyclesWithBids = cycles.map(cycle => ({
            ...cycle,
            myBid: bidsMap[cycle.id] || null,
            hasWonBefore: wonGroups.has(cycle.group_id)
          }));

          res.json(cyclesWithBids);
        });
      });
    });
  });
});

// Place a bid
router.post('/bid', [
  body('cycleId').isInt().withMessage('Cycle ID is required'),
  body('bidAmount').isFloat({ min: 0 }).withMessage('Bid amount must be a positive number')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cycleId, bidAmount } = req.body;
  const userId = req.user.id;
  const db = getDb();

  // Check if cycle exists and is open
  db.get(`
    SELECT bc.*, bg.contribution_amount, bg.total_members, bg.id as group_id, bg.status as group_status, bg.max_bid_reduction_percentage
    FROM bidding_cycles bc
    INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE bc.id = ?
  `, [cycleId], (err, cycle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cycle) {
      return res.status(404).json({ error: 'Bidding cycle not found' });
    }
    if (cycle.status !== 'open') {
      return res.status(400).json({ error: 'Bidding cycle is not open' });
    }
    if (cycle.group_status === 'completed') {
      return res.status(400).json({ error: 'This bhishi group is completed. All members have received the bhishi amount. Bidding is no longer allowed.' });
    }

    // Check if bidding period is valid
    const now = new Date();
    const startDate = new Date(cycle.bidding_start_date);
    const endDate = new Date(cycle.bidding_end_date);

    if (now < startDate) {
      return res.status(400).json({ error: 'Bidding has not started yet' });
    }
    if (now > endDate) {
      return res.status(400).json({ error: 'Bidding period has ended' });
    }

    // Check if user is a member of the group
    db.get('SELECT user_id FROM group_members WHERE group_id = ? AND user_id = ?', [cycle.group_id, userId], (err, member) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!member) {
        return res.status(403).json({ error: 'You are not a member of this group' });
      }

      // Check if user has already won in a previous cycle of this group
      db.all(`
        SELECT bc.id 
        FROM bidding_cycles bc
        WHERE bc.group_id = ? 
        AND bc.winner_user_id = ? 
        AND bc.status = 'closed'
        AND bc.id != ?
      `, [cycle.group_id, userId, cycleId], (err, previousWins) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (previousWins.length > 0) {
          return res.status(403).json({ error: 'You have already won in a previous cycle. You cannot bid again.' });
        }

        // Validate bid amount - user bids the amount they want to receive
        // Bid must be less than total pool amount
        if (bidAmount >= cycle.total_pool_amount) {
          return res.status(400).json({ 
            error: `Bid amount must be less than the bhishi amount (₹${cycle.total_pool_amount})` 
          });
        }

        // Check minimum bid based on max reduction percentage
        const maxReductionPercentage = cycle.max_bid_reduction_percentage || 40;
        const minBidAmount = cycle.total_pool_amount * (1 - maxReductionPercentage / 100);
        
        if (bidAmount < minBidAmount) {
          return res.status(400).json({ 
            error: `Bid amount (₹${bidAmount}) is below the minimum allowed (₹${minBidAmount.toFixed(2)}). Maximum reduction allowed is ${maxReductionPercentage}%` 
          });
        }

        // Check if user already placed a bid
        db.get('SELECT id FROM bids WHERE cycle_id = ? AND user_id = ?', [cycleId, userId], (err, existingBid) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (existingBid) {
            // Update existing bid
            db.run('UPDATE bids SET bid_amount = ?, bid_time = CURRENT_TIMESTAMP WHERE cycle_id = ? AND user_id = ?',
              [bidAmount, cycleId, userId], function(err) {
                if (err) {
                  return res.status(500).json({ error: 'Failed to update bid' });
                }
                res.json({ message: 'Bid updated successfully' });
              });
          } else {
            // Create new bid
            db.run('INSERT INTO bids (cycle_id, user_id, bid_amount) VALUES (?, ?, ?)',
              [cycleId, userId, bidAmount], function(err) {
                if (err) {
                  return res.status(500).json({ error: 'Failed to place bid' });
                }
                res.json({ message: 'Bid placed successfully' });
              });
          }
        });
      });
    });
  });
});

// Get bids for a cycle
router.get('/cycles/:cycleId/bids', (req, res) => {
  const { cycleId } = req.params;
  const db = getDb();

  // Check if user is admin or member of the group
  db.get(`
    SELECT bc.group_id
    FROM bidding_cycles bc
    WHERE bc.id = ?
  `, [cycleId], (err, cycle) => {
    if (err || !cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (req.user.role !== 'admin') {
      db.get('SELECT user_id FROM group_members WHERE group_id = ? AND user_id = ?', [cycle.group_id, req.user.id], (err, member) => {
        if (err || !member) {
          return res.status(403).json({ error: 'Access denied' });
        }
        getBids();
      });
    } else {
      getBids();
    }

    function getBids() {
      db.all(`
        SELECT b.*, u.full_name, u.username
        FROM bids b
        INNER JOIN users u ON b.user_id = u.id
        WHERE b.cycle_id = ?
        ORDER BY b.bid_amount ASC, b.bid_time ASC
      `, [cycleId], (err, bids) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(bids);
      });
    }
  });
});

// Helper function to manually trigger cycle closure for expired cycles
const manuallyCloseExpiredCycles = async () => {
  const db = getDb();
  const now = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT id, group_id
      FROM bidding_cycles
      WHERE status = 'open' AND bidding_end_date <= ?
    `, [now], (err, cyclesToClose) => {
      if (err) {
        return reject(err);
      }
      
      if (cyclesToClose.length === 0) {
        return resolve({ closed: 0, message: 'No expired cycles to close' });
      }
      
      const closePromises = cyclesToClose.map(cycle => closeBiddingCycle(cycle.id));
      Promise.all(closePromises)
        .then(() => resolve({ closed: cyclesToClose.length, message: `Closed ${cyclesToClose.length} cycle(s)` }))
        .catch(reject);
    });
  });
};

// Close bidding cycle and determine winner (lowest bid wins, or random if no bids)
// This function is used both by the API endpoint and the auto-close scheduler
const closeBiddingCycle = async (cycleId) => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Get cycle and group details
    db.get(`
    SELECT bc.*, bg.id as group_id, bg.contribution_amount, bg.total_members
    FROM bidding_cycles bc
    INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE bc.id = ?
  `, [cycleId], (err, cycle) => {
    if (err) {
      return reject(new Error('Database error: ' + err.message));
    }
    if (!cycle) {
      return reject(new Error('Cycle not found'));
    }
    if (cycle.status !== 'open') {
      return reject(new Error('Cycle is already closed'));
    }

    // Get all bids, lowest bid wins
    db.all('SELECT * FROM bids WHERE cycle_id = ? ORDER BY bid_amount ASC, bid_time ASC LIMIT 1', [cycleId], (err, bids) => {
      if (err) {
        return reject(new Error('Database error: ' + err.message));
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
            return reject(new Error('Database error: ' + err.message));
          }

          if (eligibleUsers.length === 0) {
            return reject(new Error('No eligible users found (all have already won)'));
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
                return reject(new Error('Failed to close cycle: ' + err.message));
              }

              console.log(`Cycle ${cycleId} status updated to closed. Random winner: ${winner.user_id}`);

              // No profit distribution when no bids - everyone pays full amount
              const originalContribution = cycle.contribution_amount;
              
              // Update contributions with full payable amount (no reduction)
              db.all('SELECT user_id FROM group_members WHERE group_id = ?', [cycle.group_id], (err, allMembers) => {
                if (err) {
                  console.error('Error fetching members:', err);
                  return reject(new Error('Failed to fetch members: ' + err.message));
                }
                
                if (allMembers && allMembers.length > 0) {
                  const contributionStmt = db.prepare('UPDATE contributions SET payable_amount = ? WHERE cycle_id = ? AND user_id = ?');
                  allMembers.forEach(member => {
                    contributionStmt.run([originalContribution, cycleId, member.user_id], (err) => {
                      if (err) console.error(`Error updating contribution for user ${member.user_id}:`, err);
                    });
                  });
                  contributionStmt.finalize((err) => {
                    if (err) {
                      console.error('Error finalizing contribution statement:', err);
                      return reject(new Error('Failed to update contributions: ' + err.message));
                    }
                    
                    console.log(`Updated contributions for ${allMembers.length} members`);

                    // Send notifications
                    sendWinnerNotification(winner.user_id, cycleId, cycle.total_pool_amount, true)
                      .then(() => {
                        console.log(`Winner notification sent for cycle ${cycleId}`);
                        return sendPaymentNotifications(cycle.group_id, cycleId, originalContribution, 0);
                      })
                      .then(() => {
                        console.log(`Payment notifications sent for cycle ${cycleId}`);
                        resolve({
                          message: 'Bidding cycle closed successfully (random winner selected - no bids)',
                          winner: {
                            userId: winner.user_id,
                            bidAmount: winningBidAmount,
                            payoutAmount: cycle.total_pool_amount,
                            isRandomWinner: true
                          }
                        });
                      })
                      .catch((notifError) => {
                        console.error('Error sending notifications:', notifError);
                        // Still resolve even if notifications fail
                        resolve({
                          message: 'Bidding cycle closed successfully (random winner selected - no bids). Notifications may have failed.',
                          winner: {
                            userId: winner.user_id,
                            bidAmount: winningBidAmount,
                            payoutAmount: cycle.total_pool_amount,
                            isRandomWinner: true
                          }
                        });
                      });
                  });
                } else {
                  resolve({
                    message: 'Bidding cycle closed successfully (random winner selected - no bids)',
                    winner: {
                      userId: winner.user_id,
                      bidAmount: winningBidAmount,
                      payoutAmount: cycle.total_pool_amount,
                      isRandomWinner: true
                    }
                  });
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
            return reject(new Error('Failed to close cycle: ' + err.message));
          }

          console.log(`Cycle ${cycleId} status updated to closed. Winner: ${winner.user_id}, Winning bid: ₹${winningBidAmount}, Profit: ₹${profitAmount}`);

          // Get ALL group members for profit distribution (including winner)
          db.all(`
            SELECT gm.user_id
            FROM group_members gm
            WHERE gm.group_id = ?
          `, [cycle.group_id], (err, allMembers) => {
            if (err) {
              console.error('Error fetching members:', err);
              return reject(new Error('Failed to fetch members: ' + err.message));
            }
            
            if (allMembers.length > 0) {
              const originalContribution = cycle.contribution_amount;
              
              if (profitAmount > 0) {
                // Calculate profit per user (equal distribution among ALL members)
                const profitPerUser = profitAmount / allMembers.length;
                console.log(`Profit per user: ₹${profitPerUser} for ${allMembers.length} members`);

                // Create profit distribution records for all members
                const profitStmt = db.prepare('INSERT INTO profit_distributions (cycle_id, user_id, profit_amount, distribution_status) VALUES (?, ?, ?, ?)');
                allMembers.forEach(member => {
                  profitStmt.run([cycleId, member.user_id, profitPerUser, 'distributed'], (err) => {
                    if (err) console.error(`Error inserting profit for user ${member.user_id}:`, err);
                  });
                });
                profitStmt.finalize((err) => {
                  if (err) {
                    console.error('Error finalizing profit statement:', err);
                    return reject(new Error('Failed to create profit distributions: ' + err.message));
                  }
                  
                  console.log(`Created profit distributions for ${allMembers.length} members`);

                  // Calculate reduced payable amount for contributions
                  const reducedPayableAmount = originalContribution - profitPerUser;
                  console.log(`Reduced payable amount: ₹${reducedPayableAmount} (original: ₹${originalContribution})`);

                  // Update contributions with reduced payable amount
                  const contributionStmt = db.prepare('UPDATE contributions SET payable_amount = ? WHERE cycle_id = ? AND user_id = ?');
                  allMembers.forEach(member => {
                    contributionStmt.run([reducedPayableAmount, cycleId, member.user_id], (err) => {
                      if (err) console.error(`Error updating contribution for user ${member.user_id}:`, err);
                    });
                  });
                  contributionStmt.finalize((err) => {
                    if (err) {
                      console.error('Error finalizing contribution statement:', err);
                      return reject(new Error('Failed to update contributions: ' + err.message));
                    }
                    
                    console.log(`Updated contributions for ${allMembers.length} members`);

                    // Send notifications
                    sendWinnerNotification(winner.user_id, cycleId, winningBidAmount, false)
                      .then(() => {
                        console.log(`Winner notification sent for cycle ${cycleId}`);
                        return sendPaymentNotifications(cycle.group_id, cycleId, reducedPayableAmount, profitPerUser);
                      })
                      .then(() => {
                        console.log(`Payment notifications sent for cycle ${cycleId}`);
                        resolve({
                          message: 'Bidding cycle closed successfully',
                          winner: {
                            userId: winner.user_id,
                            bidAmount: winningBidAmount,
                            payoutAmount: winningBidAmount,
                            profitAmount: profitAmount,
                            profitPerMember: profitPerUser,
                            isRandomWinner: false
                          }
                        });
                      })
                      .catch((notifError) => {
                        console.error('Error sending notifications:', notifError);
                        // Still resolve even if notifications fail
                        resolve({
                          message: 'Bidding cycle closed successfully. Notifications may have failed.',
                          winner: {
                            userId: winner.user_id,
                            bidAmount: winningBidAmount,
                            payoutAmount: winningBidAmount,
                            profitAmount: profitAmount,
                            profitPerMember: profitPerUser,
                            isRandomWinner: false
                          }
                        });
                      });
                  });
                });
              } else {
                // No profit but still need to update contributions and send notifications
                const contributionStmt = db.prepare('UPDATE contributions SET payable_amount = ? WHERE cycle_id = ? AND user_id = ?');
                allMembers.forEach(member => {
                  contributionStmt.run([originalContribution, cycleId, member.user_id], (err) => {
                    if (err) console.error(`Error updating contribution for user ${member.user_id}:`, err);
                  });
                });
                contributionStmt.finalize((err) => {
                  if (err) {
                    console.error('Error finalizing contribution statement:', err);
                    return reject(new Error('Failed to update contributions: ' + err.message));
                  }
                  
                  sendWinnerNotification(winner.user_id, cycleId, winningBidAmount, false)
                    .then(() => sendPaymentNotifications(cycle.group_id, cycleId, originalContribution, 0))
                    .then(() => {
                      resolve({
                        message: 'Bidding cycle closed successfully',
                        winner: {
                          userId: winner.user_id,
                          bidAmount: winningBidAmount,
                          payoutAmount: winningBidAmount,
                          profitAmount: profitAmount,
                          profitPerMember: 0,
                          isRandomWinner: false
                        }
                      });
                    })
                    .catch((notifError) => {
                      console.error('Error sending notifications:', notifError);
                      resolve({
                        message: 'Bidding cycle closed successfully. Notifications may have failed.',
                        winner: {
                          userId: winner.user_id,
                          bidAmount: winningBidAmount,
                          payoutAmount: winningBidAmount,
                          profitAmount: profitAmount,
                          profitPerMember: 0,
                          isRandomWinner: false
                        }
                      });
                    });
                });
              }
            } else {
              resolve({
                message: 'Bidding cycle closed successfully',
                winner: {
                  userId: winner.user_id,
                  bidAmount: winningBidAmount,
                  payoutAmount: winningBidAmount,
                  profitAmount: profitAmount,
                  profitPerMember: 0,
                  isRandomWinner: false
                }
              });
            }
          });
        }
      );
    });
  });
  });
};

// API endpoint for admin to manually close cycles
router.post('/cycles/:cycleId/close', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can close bidding cycles' });
  }

  const { cycleId } = req.params;
  
  try {
    const result = await closeBiddingCycle(cycleId);
    res.json(result);
  } catch (error) {
    console.error('Error closing cycle:', error);
    res.status(500).json({ error: error.message || 'Failed to close cycle' });
  }
});

// Manual trigger endpoint to close expired cycles (for testing/debugging)
router.post('/close-expired', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can trigger cycle closure' });
  }
  
  try {
    const result = await manuallyCloseExpiredCycles();
    res.json(result);
  } catch (error) {
    console.error('Error closing expired cycles:', error);
    res.status(500).json({ error: error.message || 'Failed to close expired cycles' });
  }
});

module.exports = router;
module.exports.closeBiddingCycle = closeBiddingCycle; // Export for scheduler
module.exports.manuallyCloseExpiredCycles = manuallyCloseExpiredCycles; // Export for manual trigger

