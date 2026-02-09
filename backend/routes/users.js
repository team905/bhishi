const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get user's groups
router.get('/groups', async (req, res) => {
  try {
    // Get groups where user is a member
    const userMemberships = await db.getAll('group_members', [
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    const groupIds = userMemberships.map(m => m.group_id);

    if (groupIds.length === 0) {
      return res.json([]);
    }

    // Get all groups
    const groups = await Promise.all(groupIds.map(async (groupId) => {
      const group = await db.getById('bhishi_groups', groupId);
      if (!group) return null;

      // Get member count
      const allMembers = await db.getAll('group_members', [
        { field: 'group_id', operator: '==', value: groupId }
      ]);

      return {
        ...group,
        current_members: allMembers.length
      };
    }));

    // Filter out nulls and sort by created_at
    const validGroups = groups.filter(g => g !== null);
    validGroups.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
      return dateB - dateA;
    });

    res.json(validGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[Dashboard] Fetching dashboard data for user:', userId);

    // Get user's groups
    const userMemberships = await db.getAll('group_members', [
      { field: 'user_id', operator: '==', value: userId }
    ]);

    const groupIds = userMemberships.map(m => m.group_id);

    // Get groups with details
    const groups = await Promise.all(groupIds.map(async (groupId) => {
      const group = await db.getById('bhishi_groups', groupId);
      if (!group) return null;

      // Get member count
      const allMembers = await db.getAll('group_members', [
        { field: 'group_id', operator: '==', value: groupId }
      ]);

      // Get winners count
      const closedCycles = await db.getAll('bidding_cycles', [
        { field: 'group_id', operator: '==', value: groupId },
        { field: 'admin_approved', operator: '==', value: true }
      ]);

      const uniqueWinners = new Set(closedCycles
        .filter(c => c.winner_user_id)
        .map(c => c.winner_user_id)
      );

      return {
        ...group,
        current_members: allMembers.length,
        winners_count: uniqueWinners.size
      };
    }));

    const validGroups = groups.filter(g => g !== null);

    // Get active bidding cycles for user's groups
    let activeCycles = [];
    if (groupIds.length > 0) {
      const allCycles = await Promise.all(groupIds.map(async (groupId) => {
        return await db.getAll('bidding_cycles', [
          { field: 'group_id', operator: '==', value: groupId },
          { field: 'status', operator: '==', value: 'open' }
        ]);
      }));

      activeCycles = allCycles.flat();

      // Enrich with group names and sort
      activeCycles = await Promise.all(activeCycles.map(async (cycle) => {
        const group = await db.getById('bhishi_groups', cycle.group_id);
        return {
          ...cycle,
          group_name: group ? group.name : null
        };
      }));

      activeCycles.sort((a, b) => {
        const dateA = new Date(a.bidding_end_date);
        const dateB = new Date(b.bidding_end_date);
        return dateA - dateB;
      });
    }

    // Get user's bids for active cycles
    const cycleIds = activeCycles.map(c => c.id);
    let myBids = [];
    if (cycleIds.length > 0) {
      const allBids = await Promise.all(cycleIds.map(async (cycleId) => {
        return await db.getAll('bids', [
          { field: 'cycle_id', operator: '==', value: cycleId },
          { field: 'user_id', operator: '==', value: userId }
        ]);
      }));

      myBids = allBids.flat();

      // Enrich with cycle and group info
      myBids = await Promise.all(myBids.map(async (bid) => {
        const cycle = await db.getById('bidding_cycles', bid.cycle_id);
        const group = cycle ? await db.getById('bhishi_groups', cycle.group_id) : null;
        return {
          ...bid,
          cycle_number: cycle ? cycle.cycle_number : null,
          group_name: group ? group.name : null
        };
      }));
    }

    // Get user's contributions (for open and closed cycles)
    const allContributions = await db.getAll('contributions', [
      { field: 'user_id', operator: '==', value: userId }
    ]);

    // Enrich contributions with cycle and group info
    const contributions = await Promise.all(allContributions.map(async (contribution) => {
      const cycle = await db.getById('bidding_cycles', contribution.cycle_id);
      if (!cycle || (cycle.status !== 'open' && cycle.status !== 'closed')) {
        return null;
      }

      const group = await db.getById('bhishi_groups', cycle.group_id);
      const payableAmount = contribution.payable_amount || contribution.amount;
      const earnedProfit = contribution.amount - payableAmount;

      return {
        ...contribution,
        cycle_id: cycle.id,
        cycle_number: cycle.cycle_number,
        group_name: group ? group.name : null,
        cycle_status: cycle.status,
        winner_user_id: cycle.winner_user_id,
        is_winner: cycle.winner_user_id === userId ? 1 : 0,
        payable_amount: payableAmount,
        earned_profit: earnedProfit
      };
    }));

    const validContributions = contributions.filter(c => c !== null);
    validContributions.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
      const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
      return dateB - dateA;
    });

    console.log(`[Dashboard] User ${userId} - Found ${validContributions.length} contributions`);

    // Calculate financial summary
    const totalContributions = validContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    console.log(`[Dashboard] Total contributions: ₹${totalContributions}`);

    const pendingContribs = validContributions.filter(c => c.payment_status === 'pending');
    const totalAmountDue = pendingContribs.reduce((sum, c) => sum + parseFloat(c.payable_amount || 0), 0);
    console.log(`[Dashboard] Total amount due: ₹${totalAmountDue} (${pendingContribs.length} pending)`);

    // Get profit distributions (earnings)
    const profitDistributions = await db.getAll('profit_distributions', [
      { field: 'user_id', operator: '==', value: userId }
    ], { field: 'created_at', direction: 'desc' });

    // Enrich profit distributions
    const enrichedProfitDistributions = await Promise.all(profitDistributions.map(async (pd) => {
      const cycle = await db.getById('bidding_cycles', pd.cycle_id);
      const group = cycle ? await db.getById('bhishi_groups', cycle.group_id) : null;
      return {
        ...pd,
        cycle_number: cycle ? cycle.cycle_number : null,
        group_name: group ? group.name : null
      };
    }));

    const totalEarnings = enrichedProfitDistributions.reduce((sum, p) => sum + parseFloat(p.profit_amount || 0), 0);
    console.log(`[Dashboard] Total earnings: ₹${totalEarnings} (${enrichedProfitDistributions.length} distributions)`);

    // Get winnings (payouts received)
    const allWinningCycles = await db.getAll('bidding_cycles', [
      { field: 'winner_user_id', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'closed' }
    ], { field: 'created_at', direction: 'desc' });

    // Enrich winnings
    const winnings = await Promise.all(allWinningCycles.map(async (cycle) => {
      const group = await db.getById('bhishi_groups', cycle.group_id);
      return {
        cycle_id: cycle.id,
        cycle_number: cycle.cycle_number,
        group_id: cycle.group_id,
        group_name: group ? group.name : null,
        total_pool_amount: cycle.total_pool_amount,
        winning_bid_amount: cycle.winning_bid_amount,
        payout_amount: cycle.winning_bid_amount,
        payout_date: cycle.payout_date,
        admin_approved: cycle.admin_approved
      };
    }));

    const totalWinnings = winnings
      .filter(w => w.admin_approved)
      .reduce((sum, w) => sum + parseFloat(w.payout_amount || 0), 0);

    const hasWon = winnings.length > 0;
    console.log(`[Dashboard] Winnings: ${winnings.length} cycles, Total approved: ₹${totalWinnings}, HasWon: ${hasWon}`);

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
      groups: validGroups,
      activeCycles,
      myBids,
      contributions: validContributions,
      financialSummary,
      profitDistributions: enrichedProfitDistributions,
      winnings
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    console.error('[Dashboard] Error stack:', error.stack);
    console.error('[Dashboard] Error message:', error.message);
    res.status(500).json({ 
      error: 'Database error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    let conditions = [
      { field: 'user_id', operator: '==', value: req.user.id }
    ];

    if (unreadOnly === 'true') {
      conditions.push({ field: 'is_read', operator: '==', value: false });
    }

    const notifications = await db.getAll('notifications', conditions, { field: 'created_at', direction: 'desc' }, 50);

    // Enrich with cycle and group info
    const enrichedNotifications = await Promise.all(notifications.map(async (notification) => {
      let cycle = null;
      let group = null;

      if (notification.cycle_id) {
        cycle = await db.getById('bidding_cycles', notification.cycle_id);
        if (cycle) {
          group = await db.getById('bhishi_groups', cycle.group_id);
        }
      }

      return {
        ...notification,
        cycle_number: cycle ? cycle.cycle_number : null,
        group_name: group ? group.name : null
      };
    }));

    res.json(enrichedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;

  try {
    // Verify notification belongs to user
    const notification = await db.getById('notifications', id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.update('notifications', id, {
      is_read: true
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
