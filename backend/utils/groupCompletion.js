const { getDb } = require('../config/database');

/**
 * Check if all members of a group have won and mark group as completed
 */
const checkGroupCompletion = (groupId) => {
  const db = getDb();

  // Get total members in group
  db.get('SELECT total_members FROM bhishi_groups WHERE id = ?', [groupId], (err, group) => {
    if (err || !group) {
      console.error('Error checking group completion:', err);
      return;
    }

    // Get count of unique winners
    db.get(`
      SELECT COUNT(DISTINCT winner_user_id) as winner_count
      FROM bidding_cycles
      WHERE group_id = ? AND winner_user_id IS NOT NULL AND admin_approved = 1
    `, [groupId], (err, result) => {
      if (err) {
        console.error('Error counting winners:', err);
        return;
      }

      // If all members have won, mark group as completed
      if (result.winner_count >= group.total_members) {
        db.run(
          'UPDATE bhishi_groups SET status = ? WHERE id = ?',
          ['completed', groupId],
          (err) => {
            if (err) {
              console.error('Error marking group as completed:', err);
            } else {
              console.log(`Group ${groupId} marked as completed - all ${group.total_members} members have won`);
            }
          }
        );
      }
    });
  });
};

module.exports = { checkGroupCompletion };

