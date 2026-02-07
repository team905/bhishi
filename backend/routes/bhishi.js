const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get bhishi group details
router.get('/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  const db = getDb();

  // Check if user is a member
  db.get('SELECT user_id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!member && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Get group details
    db.get(`
      SELECT 
        bg.*,
        u.full_name as created_by_name,
        COUNT(DISTINCT gm.user_id) as current_members
      FROM bhishi_groups bg
      LEFT JOIN users u ON bg.created_by = u.id
      LEFT JOIN group_members gm ON bg.id = gm.group_id
      WHERE bg.id = ?
      GROUP BY bg.id
    `, [groupId], (err, group) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get members
      db.all(`
        SELECT u.id, u.username, u.full_name, u.email, gm.joined_at
        FROM group_members gm
        INNER JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at ASC
      `, [groupId], (err, members) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Get cycles
        db.all(`
          SELECT 
            bc.*,
            u.full_name as winner_name
          FROM bidding_cycles bc
          LEFT JOIN users u ON bc.winner_user_id = u.id
          WHERE bc.group_id = ?
          ORDER BY bc.cycle_number ASC
        `, [groupId], (err, cycles) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            ...group,
            members,
            cycles
          });
        });
      });
    });
  });
});

// Get payment status for all members in a cycle
router.get('/groups/:groupId/cycles/:cycleId/payments', (req, res) => {
  const { groupId, cycleId } = req.params;
  const db = getDb();

  // Verify user is a member of the group or is admin
  db.get('SELECT user_id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!member && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Not a member of this group.' });
    }

    // Get all contributions for this cycle with member details
    db.all(`
      SELECT 
        c.*,
        u.id as user_id,
        u.full_name,
        u.username,
        u.email
      FROM contributions c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.cycle_id = ?
      ORDER BY u.full_name ASC
    `, [cycleId], (err, contributions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(contributions);
    });
  });
});

module.exports = router;

