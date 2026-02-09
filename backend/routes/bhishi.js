const express = require('express');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get bhishi group details
router.get('/groups/:groupId', async (req, res) => {
  const { groupId } = req.params;

  try {
    // Check if user is a member
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    if (members.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Get group details
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get creator name
    const creator = await db.getById('users', group.created_by);

    // Get member count
    const allMembers = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId }
    ], { field: 'joined_at', direction: 'asc' });

    // Get members with user details
    const membersWithDetails = await Promise.all(allMembers.map(async (member) => {
      const user = await db.getById('users', member.user_id);
      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        joined_at: member.joined_at
      };
    }));

    // Get cycles
    const cycles = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId }
    ], { field: 'cycle_number', direction: 'asc' });

    // Enrich cycles with winner names
    const cyclesWithWinners = await Promise.all(cycles.map(async (cycle) => {
      const winner = cycle.winner_user_id ? await db.getById('users', cycle.winner_user_id) : null;
      return {
        ...cycle,
        winner_name: winner ? winner.full_name : null
      };
    }));

    res.json({
      ...group,
      created_by_name: creator ? creator.full_name : null,
      current_members: allMembers.length,
      members: membersWithDetails,
      cycles: cyclesWithWinners
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get payment status for all members in a cycle
router.get('/groups/:groupId/cycles/:cycleId/payments', async (req, res) => {
  const { groupId, cycleId } = req.params;

  try {
    // Verify user is a member of the group or is admin
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    if (members.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Get all contributions for this cycle
    const contributions = await db.getAll('contributions', [
      { field: 'cycle_id', operator: '==', value: cycleId }
    ]);

    // Enrich with member details
    const contributionsWithDetails = await Promise.all(contributions.map(async (contribution) => {
      const user = await db.getById('users', contribution.user_id);
      return {
        ...contribution,
        user_id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email
      };
    }));

    // Sort by full name
    contributionsWithDetails.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    res.json(contributionsWithDetails);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
