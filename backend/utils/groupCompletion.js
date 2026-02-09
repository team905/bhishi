const { db } = require('../config/database');

/**
 * Check if all members of a group have won and mark group as completed
 */
const checkGroupCompletion = async (groupId) => {
  try {
    // Get total members in group
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      console.error('Error checking group completion: Group not found');
      return;
    }

    // Get count of unique winners (approved cycles only)
    const closedCycles = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'admin_approved', operator: '==', value: true }
    ]);

    const uniqueWinners = new Set(closedCycles
      .filter(c => c.winner_user_id)
      .map(c => c.winner_user_id)
    );

    // If all members have won, mark group as completed
    if (uniqueWinners.size >= group.total_members) {
      await db.update('bhishi_groups', groupId, {
        status: 'completed'
      });
      console.log(`Group ${groupId} marked as completed - all ${group.total_members} members have won`);
    }
  } catch (error) {
    console.error('Error checking group completion:', error);
  }
};

module.exports = { checkGroupCompletion };
