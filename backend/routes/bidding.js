const express = require('express');
const { body, validationResult } = require('express-validator');
const { db, getFirestore } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendPaymentNotifications, sendWinnerNotification } = require('../services/notificationService');
const admin = require('firebase-admin');

const router = express.Router();

router.use(authenticate);

// Get active bidding cycles for user's groups
router.get('/cycles', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's groups (excluding completed groups)
    const userMemberships = await db.getAll('group_members', [
      { field: 'user_id', operator: '==', value: userId }
    ]);

    if (userMemberships.length === 0) {
      return res.json([]);
    }

    const groupIds = userMemberships.map(g => g.group_id);

    // Get all groups to filter out completed ones
    const groups = await Promise.all(groupIds.map(id => db.getById('bhishi_groups', id)));
    const activeGroupIds = groups.filter(g => g && g.status !== 'completed').map(g => g.id);

    if (activeGroupIds.length === 0) {
      return res.json([]);
    }

    // Get open cycles for active groups
    const allCycles = await Promise.all(activeGroupIds.map(async (groupId) => {
      return await db.getAll('bidding_cycles', [
        { field: 'group_id', operator: '==', value: groupId },
        { field: 'status', operator: '==', value: 'open' }
      ]);
    }));

    let cycles = allCycles.flat();

    // Enrich cycles with group info and bid stats
    cycles = await Promise.all(cycles.map(async (cycle) => {
      const group = await db.getById('bhishi_groups', cycle.group_id);
      if (!group) return null;

      // Get bids for this cycle
      const bids = await db.getAll('bids', [
        { field: 'cycle_id', operator: '==', value: cycle.id }
      ], { field: 'bid_amount', direction: 'asc' });

      const minBidAmount = cycle.total_pool_amount * (1 - (group.max_bid_reduction_percentage || 40) / 100);

      return {
        ...cycle,
        group_name: group.name,
        contribution_amount: group.contribution_amount,
        group_status: group.status,
        max_bid_reduction_percentage: group.max_bid_reduction_percentage || 40,
        min_bid_amount: minBidAmount,
        bid_count: bids.length,
        lowest_bid: bids.length > 0 ? bids[0].bid_amount : null,
        highest_bid: bids.length > 0 ? bids[bids.length - 1].bid_amount : null
      };
    }));

    cycles = cycles.filter(c => c !== null);
    cycles.sort((a, b) => new Date(a.bidding_end_date) - new Date(b.bidding_end_date));

    const cycleIds = cycles.map(c => c.id);

    if (cycleIds.length === 0) {
      return res.json(cycles.map(c => ({ ...c, myBid: null, hasWonBefore: false })));
    }

    // Check if user has won in previous cycles of these groups
    const allPreviousCycles = await Promise.all(activeGroupIds.map(async (groupId) => {
      return await db.getAll('bidding_cycles', [
        { field: 'group_id', operator: '==', value: groupId },
        { field: 'winner_user_id', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'closed' }
      ]);
    }));

    const previousWins = allPreviousCycles.flat().filter(c => !cycleIds.includes(c.id));
    const wonGroups = new Set(previousWins.map(w => w.group_id));

    // Get user's bids for these cycles
    const allBids = await Promise.all(cycleIds.map(async (cycleId) => {
      return await db.getAll('bids', [
        { field: 'cycle_id', operator: '==', value: cycleId },
        { field: 'user_id', operator: '==', value: userId }
      ]);
    }));

    const myBids = allBids.flat();
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
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Place a bid
router.post('/bid', [
  body('cycleId').notEmpty().withMessage('Cycle ID is required'),
  body('bidAmount').isFloat({ min: 0 }).withMessage('Bid amount must be a positive number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cycleId, bidAmount } = req.body;
  const userId = req.user.id;

  try {
    // Check if cycle exists and is open
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Bidding cycle not found' });
    }
    if (cycle.status !== 'open') {
      return res.status(400).json({ error: 'Bidding cycle is not open' });
    }

    // Get group details
    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.status === 'completed') {
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
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: cycle.group_id },
      { field: 'user_id', operator: '==', value: userId }
    ]);

    if (members.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Check if user has already won in a previous cycle of this group
    const previousWins = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: cycle.group_id },
      { field: 'winner_user_id', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'closed' }
    ]);

    const hasWonBefore = previousWins.some(w => w.id !== cycleId);
    if (hasWonBefore) {
      return res.status(403).json({ error: 'You have already won in a previous cycle. You cannot bid again.' });
    }

    // Validate bid amount
    if (bidAmount >= cycle.total_pool_amount) {
      return res.status(400).json({ 
        error: `Bid amount must be less than the bhishi amount (₹${cycle.total_pool_amount})` 
      });
    }

    // Check minimum bid based on max reduction percentage
    const maxReductionPercentage = group.max_bid_reduction_percentage || 40;
    const minBidAmount = cycle.total_pool_amount * (1 - maxReductionPercentage / 100);
    
    if (bidAmount < minBidAmount) {
      return res.status(400).json({ 
        error: `Bid amount (₹${bidAmount}) is below the minimum allowed (₹${minBidAmount.toFixed(2)}). Maximum reduction allowed is ${maxReductionPercentage}%` 
      });
    }

    // Check if user already placed a bid
    const existingBids = await db.getAll('bids', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: userId }
    ]);

    if (existingBids.length > 0) {
      // Update existing bid
      await db.update('bids', existingBids[0].id, {
        bid_amount: bidAmount,
        bid_time: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.json({ message: 'Bid updated successfully' });
    } else {
      // Create new bid
      await db.create('bids', {
        cycle_id: cycleId,
        user_id: userId,
        bid_amount: bidAmount,
      });
      res.json({ message: 'Bid placed successfully' });
    }
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Get bids for a cycle
router.get('/cycles/:cycleId/bids', async (req, res) => {
  const { cycleId } = req.params;

  try {
    // Check if cycle exists
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    // Check if user is admin or member of the group
    if (req.user.role !== 'admin') {
      const members = await db.getAll('group_members', [
        { field: 'group_id', operator: '==', value: cycle.group_id },
        { field: 'user_id', operator: '==', value: req.user.id }
      ]);

      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get bids
    const bids = await db.getAll('bids', [
      { field: 'cycle_id', operator: '==', value: cycleId }
    ], { field: 'bid_amount', direction: 'asc' });

    // Enrich with user info
    const enrichedBids = await Promise.all(bids.map(async (bid) => {
      const user = await db.getById('users', bid.user_id);
      return {
        ...bid,
        full_name: user ? user.full_name : null,
        username: user ? user.username : null
      };
    }));

    // Sort by bid amount, then by bid time
    enrichedBids.sort((a, b) => {
      if (a.bid_amount !== b.bid_amount) {
        return a.bid_amount - b.bid_amount;
      }
      const timeA = a.bid_time?.toDate ? a.bid_time.toDate() : new Date(a.bid_time);
      const timeB = b.bid_time?.toDate ? b.bid_time.toDate() : new Date(b.bid_time);
      return timeA - timeB;
    });

    res.json(enrichedBids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper function to manually trigger cycle closure for expired cycles
const manuallyCloseExpiredCycles = async () => {
  const now = new Date();
  
  try {
    // Get all open cycles
    const allOpenCycles = await db.getAll('bidding_cycles', [
      { field: 'status', operator: '==', value: 'open' }
    ]);

    // Filter expired cycles
    const cyclesToClose = allOpenCycles.filter(cycle => {
      const endDate = new Date(cycle.bidding_end_date);
      return endDate <= now;
    });
    
    if (cyclesToClose.length === 0) {
      return { closed: 0, message: 'No expired cycles to close' };
    }
    
    const closePromises = cyclesToClose.map(cycle => closeBiddingCycle(cycle.id));
    await Promise.all(closePromises);
    
    return { closed: cyclesToClose.length, message: `Closed ${cyclesToClose.length} cycle(s)` };
  } catch (error) {
    throw error;
  }
};

// Close bidding cycle and determine winner (lowest bid wins, or random if no bids)
const closeBiddingCycle = async (cycleId) => {
  try {
    // Get cycle and group details
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      throw new Error('Cycle not found');
    }
    if (cycle.status !== 'open') {
      throw new Error('Cycle is already closed');
    }

    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (!group) {
      throw new Error('Group not found');
    }

    // Get all bids, lowest bid wins
    const allBids = await db.getAll('bids', [
      { field: 'cycle_id', operator: '==', value: cycleId }
    ], { field: 'bid_amount', direction: 'asc' });

    let winner;
    let winningBidAmount = null;
    let isRandomWinner = false;

    if (allBids.length === 0) {
      // No bids placed - randomly select a winner from users who haven't won yet
      const allMembers = await db.getAll('group_members', [
        { field: 'group_id', operator: '==', value: cycle.group_id }
      ]);

      // Get previous winners in this group
      const previousWinners = await db.getAll('bidding_cycles', [
        { field: 'group_id', operator: '==', value: cycle.group_id },
        { field: 'winner_user_id', operator: '!=', value: null },
        { field: 'id', operator: '!=', value: cycleId }
      ]);

      const winnerIds = new Set(previousWinners.map(c => c.winner_user_id));
      const eligibleUsers = allMembers.filter(m => !winnerIds.has(m.user_id));

      if (eligibleUsers.length === 0) {
        throw new Error('No eligible users found (all have already won)');
      }

      // Randomly select a winner
      const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
      winner = eligibleUsers[randomIndex];
      isRandomWinner = true;
      winningBidAmount = cycle.total_pool_amount; // No bid, winner gets full amount

      // Update cycle
      await db.update('bidding_cycles', cycleId, {
        status: 'closed',
        winner_user_id: winner.user_id,
        winning_bid_amount: winningBidAmount,
        is_random_winner: true,
      });

      console.log(`Cycle ${cycleId} status updated to closed. Random winner: ${winner.user_id}`);

      // No profit distribution when no bids - everyone pays full amount
      const originalContribution = group.contribution_amount;
      
      // Update contributions with full payable amount (no reduction)
      const contributions = await db.getAll('contributions', [
        { field: 'cycle_id', operator: '==', value: cycleId }
      ]);

      const firestore = getFirestore();
      const batch = firestore.batch();

      contributions.forEach(contribution => {
        const contributionRef = firestore.collection('contributions').doc(contribution.id);
        batch.update(contributionRef, {
          payable_amount: originalContribution,
        });
      });

      await batch.commit();
      console.log(`Updated contributions for ${contributions.length} members`);

      // Send notifications
      try {
        await sendWinnerNotification(winner.user_id, cycleId, cycle.total_pool_amount, true);
        console.log(`Winner notification sent for cycle ${cycleId}`);
        await sendPaymentNotifications(cycle.group_id, cycleId, originalContribution, 0);
        console.log(`Payment notifications sent for cycle ${cycleId}`);
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      return {
        message: 'Bidding cycle closed successfully (random winner selected - no bids)',
        winner: {
          userId: winner.user_id,
          bidAmount: winningBidAmount,
          payoutAmount: cycle.total_pool_amount,
          isRandomWinner: true
        }
      };
    }

    // Bids were placed - lowest bid wins
    winner = allBids[0];
    winningBidAmount = winner.bid_amount;

    // Profit = Total amount - Winning bid amount
    const profitAmount = cycle.total_pool_amount - winningBidAmount;

    // Update cycle
    await db.update('bidding_cycles', cycleId, {
      status: 'closed',
      winner_user_id: winner.user_id,
      winning_bid_amount: winningBidAmount,
      is_random_winner: false,
    });

    console.log(`Cycle ${cycleId} status updated to closed. Winner: ${winner.user_id}, Winning bid: ₹${winningBidAmount}, Profit: ₹${profitAmount}`);

    // Get ALL group members for profit distribution (including winner)
    const allMembers = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: cycle.group_id }
    ]);

    if (allMembers.length === 0) {
      return {
        message: 'Bidding cycle closed successfully',
        winner: {
          userId: winner.user_id,
          bidAmount: winningBidAmount,
          payoutAmount: winningBidAmount,
          profitAmount: profitAmount,
          profitPerMember: 0,
          isRandomWinner: false
        }
      };
    }

    const originalContribution = group.contribution_amount;
    const firestore = getFirestore();
    const batch = firestore.batch();

    if (profitAmount > 0) {
      // Calculate profit per user (equal distribution among ALL members)
      const profitPerUser = profitAmount / allMembers.length;
      console.log(`Profit per user: ₹${profitPerUser} for ${allMembers.length} members`);

      // Create profit distribution records for all members
      allMembers.forEach(member => {
        const profitRef = firestore.collection('profit_distributions').doc();
        batch.set(profitRef, {
          cycle_id: cycleId,
          user_id: member.user_id,
          profit_amount: profitPerUser,
          distribution_status: 'distributed',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log(`Created profit distributions for ${allMembers.length} members`);

      // Calculate reduced payable amount for contributions
      const reducedPayableAmount = originalContribution - profitPerUser;
      console.log(`Reduced payable amount: ₹${reducedPayableAmount} (original: ₹${originalContribution})`);

      // Update contributions with reduced payable amount
      const contributions = await db.getAll('contributions', [
        { field: 'cycle_id', operator: '==', value: cycleId }
      ]);

      contributions.forEach(contribution => {
        const contributionRef = firestore.collection('contributions').doc(contribution.id);
        batch.update(contributionRef, {
          payable_amount: reducedPayableAmount,
        });
      });

      await batch.commit();
      console.log(`Updated contributions for ${allMembers.length} members`);

      // Send notifications
      try {
        await sendWinnerNotification(winner.user_id, cycleId, winningBidAmount, false);
        console.log(`Winner notification sent for cycle ${cycleId}`);
        await sendPaymentNotifications(cycle.group_id, cycleId, reducedPayableAmount, profitPerUser);
        console.log(`Payment notifications sent for cycle ${cycleId}`);
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      return {
        message: 'Bidding cycle closed successfully',
        winner: {
          userId: winner.user_id,
          bidAmount: winningBidAmount,
          payoutAmount: winningBidAmount,
          profitAmount: profitAmount,
          profitPerMember: profitPerUser,
          isRandomWinner: false
        }
      };
    } else {
      // No profit but still need to update contributions and send notifications
      const contributions = await db.getAll('contributions', [
        { field: 'cycle_id', operator: '==', value: cycleId }
      ]);

      contributions.forEach(contribution => {
        const contributionRef = firestore.collection('contributions').doc(contribution.id);
        batch.update(contributionRef, {
          payable_amount: originalContribution,
        });
      });

      await batch.commit();

      try {
        await sendWinnerNotification(winner.user_id, cycleId, winningBidAmount, false);
        await sendPaymentNotifications(cycle.group_id, cycleId, originalContribution, 0);
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      return {
        message: 'Bidding cycle closed successfully',
        winner: {
          userId: winner.user_id,
          bidAmount: winningBidAmount,
          payoutAmount: winningBidAmount,
          profitAmount: profitAmount,
          profitPerMember: 0,
          isRandomWinner: false
        }
      };
    }
  } catch (error) {
    console.error('Error closing cycle:', error);
    throw error;
  }
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
