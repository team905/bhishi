const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkGroupCompletion } = require('../utils/groupCompletion');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Create user
router.post('/users', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages, errors: errors.array() });
    }

    const { username, email, password, fullName, phone } = req.body;
    const db = getDb();

    // Check if username or email already exists
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (existing) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'INSERT INTO users (username, email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, fullName, phone || null, 'user'],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            if (err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: `Failed to create user: ${err.message}` });
          }

          res.status(201).json({
            message: 'User created successfully',
            user: {
              id: this.lastID,
              username,
              email,
              fullName,
              phone
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
router.get('/users', (req, res) => {
  const db = getDb();
  db.all('SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Update user
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { id } = req.params;
  const { email, fullName, phone, isActive } = req.body;
  const db = getDb();

  const updates = [];
  const values = [];

  if (email) { updates.push('email = ?'); values.push(email); }
  if (fullName) { updates.push('full_name = ?'); values.push(fullName); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update user' });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Create Bhishi group
router.post('/bhishi-groups', [
  body('name').notEmpty().withMessage('Group name is required'),
  body('contributionAmount').isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive'),
  body('totalMembers').isInt({ min: 2 }).withMessage('Total members must be at least 2')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { name, description, contributionAmount, totalMembers, cycleDurationDays, maxBidReductionPercentage } = req.body;
  const db = getDb();

  db.run(
    'INSERT INTO bhishi_groups (name, description, contribution_amount, total_members, cycle_duration_days, max_bid_reduction_percentage, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, contributionAmount, totalMembers, cycleDurationDays || 30, maxBidReductionPercentage || 40, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create bhishi group' });
      }

      res.status(201).json({
        message: 'Bhishi group created successfully',
        group: {
          id: this.lastID,
          name,
          description,
          contributionAmount,
          totalMembers,
          cycleDurationDays: cycleDurationDays || 30,
          maxBidReductionPercentage: maxBidReductionPercentage || 40
        }
      });
    }
  );
});

// Get all bhishi groups
router.get('/bhishi-groups', (req, res) => {
  const db = getDb();
  db.all(`
    SELECT 
      bg.*,
      u.full_name as created_by_name,
      COUNT(DISTINCT gm.user_id) as current_members
    FROM bhishi_groups bg
    LEFT JOIN users u ON bg.created_by = u.id
    LEFT JOIN group_members gm ON bg.id = gm.group_id
    GROUP BY bg.id
    ORDER BY bg.created_at DESC
  `, (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(groups);
  });
});

// Update bhishi group (only before first cycle completes)
router.put('/bhishi-groups/:groupId', [
  body('name').optional().notEmpty().withMessage('Group name cannot be empty'),
  body('contributionAmount').optional().isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive'),
  body('totalMembers').optional().isInt({ min: 2 }).withMessage('Total members must be at least 2'),
  body('maxBidReductionPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Max bid reduction must be between 0 and 100')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId } = req.params;
  const { name, description, contributionAmount, totalMembers, cycleDurationDays, maxBidReductionPercentage } = req.body;
  const db = getDb();

  // Check if group exists and has any completed cycles
  db.get(`
    SELECT bg.*, 
      (SELECT COUNT(*) FROM bidding_cycles WHERE group_id = bg.id AND status = 'closed') as completed_cycles_count
    FROM bhishi_groups bg
    WHERE bg.id = ?
  `, [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.status === 'completed' || group.completed_cycles_count > 0) {
      return res.status(400).json({ error: 'Cannot edit group after first bidding cycle has been completed' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (contributionAmount !== undefined) {
      updates.push('contribution_amount = ?');
      values.push(contributionAmount);
    }
    if (totalMembers !== undefined) {
      updates.push('total_members = ?');
      values.push(totalMembers);
    }
    if (cycleDurationDays !== undefined) {
      updates.push('cycle_duration_days = ?');
      values.push(cycleDurationDays);
    }
    if (maxBidReductionPercentage !== undefined) {
      updates.push('max_bid_reduction_percentage = ?');
      values.push(maxBidReductionPercentage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(groupId);

    db.run(
      `UPDATE bhishi_groups SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update group' });
        }
        res.json({ message: 'Group updated successfully' });
      }
    );
  });
});

// Delete bhishi group (only before first cycle completes)
router.delete('/bhishi-groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  const db = getDb();

  // Check if group exists and has any completed cycles
  db.get(`
    SELECT bg.*, 
      (SELECT COUNT(*) FROM bidding_cycles WHERE group_id = bg.id AND status = 'closed') as completed_cycles_count
    FROM bhishi_groups bg
    WHERE bg.id = ?
  `, [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.status === 'completed' || group.completed_cycles_count > 0) {
      return res.status(400).json({ error: 'Cannot delete group after first bidding cycle has been completed' });
    }

    // Check if group has any cycles (even open ones)
    db.get('SELECT COUNT(*) as count FROM bidding_cycles WHERE group_id = ?', [groupId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: 'Cannot delete group that has bidding cycles. Please delete cycles first.' });
      }

      // Delete group members first (cascade should handle this, but being explicit)
      db.run('DELETE FROM group_members WHERE group_id = ?', [groupId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete group members' });
        }

        // Delete the group
        db.run('DELETE FROM bhishi_groups WHERE id = ?', [groupId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to delete group' });
          }
          res.json({ message: 'Group deleted successfully' });
        });
      });
    });
  });
});

// Add member to group
router.post('/bhishi-groups/:groupId/members', [
  body('userId').isInt().withMessage('User ID is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId } = req.params;
  const { userId } = req.body;
  const db = getDb();

  // Check if group exists and get member limit
  db.get('SELECT total_members FROM bhishi_groups WHERE id = ?', [groupId], (err, group) => {
    if (err || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check current member count
    db.get('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?', [groupId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count >= group.total_members) {
        return res.status(400).json({ error: 'Group is full' });
      }

      // Add member
      db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, userId], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'User is already a member of this group' });
          }
          return res.status(500).json({ error: 'Failed to add member' });
        }

        res.status(201).json({ message: 'Member added successfully' });
      });
    });
  });
});

// Reset user password (admin only)
router.post('/users/:userId/reset-password', [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { userId } = req.params;
  const { newPassword } = req.body;
  const db = getDb();
  const bcrypt = require('bcryptjs');

  // Check if user exists
  db.get('SELECT id, username FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and reset password_changed flag (user must change on next login)
      db.run(
        'UPDATE users SET password = ?, password_changed = 0 WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) {
            console.error('Error resetting password:', err);
            return res.status(500).json({ error: 'Failed to reset password' });
          }
          res.json({ 
            message: `Password reset successfully for user: ${user.username}. User will be required to change password on next login.` 
          });
        }
      );
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      return res.status(500).json({ error: 'Failed to hash password' });
    }
  });
});

// Remove member from group
router.delete('/bhishi-groups/:groupId/members/:userId', (req, res) => {
  const { groupId, userId } = req.params;
  const db = getDb();

  db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to remove member' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Member not found in group' });
    }
    res.json({ message: 'Member removed successfully' });
  });
});

// Create bidding cycle
router.post('/bidding-cycles', [
  body('groupId').isInt().withMessage('Group ID is required'),
  body('biddingStartDate').notEmpty().withMessage('Bidding start date is required'),
  body('biddingEndDate').notEmpty().withMessage('Bidding end date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId, biddingStartDate, biddingEndDate, sendNotifications } = req.body;
  const db = getDb();
  const notificationService = require('../services/notificationService');

  // Get current cycle number and group details
  db.get('SELECT current_cycle, contribution_amount, total_members, status FROM bhishi_groups WHERE id = ?', [groupId], async (err, group) => {
    if (err || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.status === 'completed') {
      return res.status(400).json({ error: 'This bhishi group is completed. All members have received the bhishi amount. No further cycles can be created.' });
    }

    const cycleNumber = group.current_cycle;
    const totalPoolAmount = group.contribution_amount * group.total_members;

    db.run(
      `INSERT INTO bidding_cycles (group_id, cycle_number, bidding_start_date, bidding_end_date, total_pool_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, cycleNumber, biddingStartDate, biddingEndDate, totalPoolAmount],
      function(err) {
        if (err) {
          console.error('Error creating bidding cycle:', err);
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: `Cycle #${cycleNumber} already exists for this group` });
          }
          return res.status(500).json({ error: `Failed to create bidding cycle: ${err.message || 'Unknown error'}` });
        }

        // Create contribution records for all members (including previous winners)
        db.all('SELECT user_id FROM group_members WHERE group_id = ?', [groupId], (err, members) => {
          if (err) {
            console.error('Error fetching members:', err);
            return res.status(500).json({ error: `Failed to create contributions: ${err.message}` });
          }

          const cycleId = this.lastID;
          
          if (members.length === 0) {
            return res.status(400).json({ error: 'Group has no members. Please add members before creating a bidding cycle.' });
          }

          const stmt = db.prepare('INSERT INTO contributions (cycle_id, user_id, amount, payable_amount) VALUES (?, ?, ?, ?)');
          let hasError = false;
          let errorMessage = '';
          
          members.forEach(member => {
            stmt.run([cycleId, member.user_id, group.contribution_amount, group.contribution_amount], (err) => {
              if (err && !hasError) {
                hasError = true;
                errorMessage = err.message;
                console.error('Error creating contribution:', err);
              }
            });
          });

          stmt.finalize((err) => {
            if (err) {
              console.error('Error finalizing contributions:', err);
              return res.status(500).json({ error: `Failed to create contributions: ${err.message}` });
            }

            if (hasError) {
              return res.status(500).json({ error: `Failed to create some contributions: ${errorMessage}` });
            }

            // Send notifications if requested (async, don't wait)
            if (sendNotifications !== false) {
              notificationService.notifyBiddingCycle(cycleId).catch(notifError => {
                console.error('Failed to send notifications:', notifError);
                // Don't fail the request if notifications fail
              });
            }

            res.status(201).json({
              message: 'Bidding cycle created successfully',
              cycle: {
                id: cycleId,
                groupId,
                cycleNumber,
                biddingStartDate,
                biddingEndDate,
                totalPoolAmount
              }
            });
          });
        });
      }
    );
  });
});

// Get all bidding cycles
router.get('/bidding-cycles', (req, res) => {
  const db = getDb();
  const { groupId } = req.query;

  let query = `
    SELECT 
      bc.*,
      bg.name as group_name,
      u.full_name as winner_name,
      a.signed_at as agreement_signed,
      v.verification_status,
      v.verified_at
    FROM bidding_cycles bc
    LEFT JOIN bhishi_groups bg ON bc.group_id = bg.id
    LEFT JOIN users u ON bc.winner_user_id = u.id
    LEFT JOIN agreements a ON bc.id = a.cycle_id AND bc.winner_user_id = a.user_id
    LEFT JOIN video_verifications v ON bc.id = v.cycle_id AND bc.winner_user_id = v.user_id
  `;

  const params = [];
  if (groupId) {
    query += ' WHERE bc.group_id = ?';
    params.push(groupId);
  }

  query += ' ORDER BY bc.created_at DESC';

  db.all(query, params, (err, cycles) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(cycles);
  });
});

// Approve winner payout
router.post('/bidding-cycles/:cycleId/approve-payout', (req, res) => {
  const { cycleId } = req.params;
  const db = getDb();

  // Check if agreement is signed and video is verified
  db.get(`
    SELECT 
      bc.winner_user_id,
      a.id as agreement_id,
      a.signed_at,
      v.id as verification_id,
      v.verification_status
    FROM bidding_cycles bc
    LEFT JOIN agreements a ON bc.id = a.cycle_id AND bc.winner_user_id = a.user_id
    LEFT JOIN video_verifications v ON bc.id = v.cycle_id AND bc.winner_user_id = v.user_id
    WHERE bc.id = ?
  `, [cycleId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (!result.agreement_id || !result.signed_at) {
      return res.status(400).json({ 
        error: 'Cannot approve payout. Winner has not signed the agreement yet.' 
      });
    }

    if (!result.verification_id || result.verification_status !== 'approved') {
      return res.status(400).json({ 
        error: 'Cannot approve payout. Video verification is not approved yet.' 
      });
    }

    // Approve payout
    db.run(
      'UPDATE bidding_cycles SET admin_approved = 1, payout_date = CURRENT_TIMESTAMP WHERE id = ?',
      [cycleId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to approve payout' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Cycle not found' });
        }

        // Update group current cycle and check for completion
        db.get('SELECT group_id FROM bidding_cycles WHERE id = ?', [cycleId], (err, cycle) => {
          if (!err && cycle) {
            db.run('UPDATE bhishi_groups SET current_cycle = current_cycle + 1 WHERE id = ?', [cycle.group_id], (err) => {
              if (!err) {
                // Check if all members have won
                checkGroupCompletion(cycle.group_id);
              }
            });
          }
        });

        res.json({ message: 'Payout approved successfully' });
      }
    );
  });
});

// Get all disputes
router.get('/disputes', (req, res) => {
  const db = getDb();
  db.all(`
    SELECT 
      d.*,
      u.full_name as user_name,
      bc.cycle_number,
      bg.name as group_name
    FROM disputes d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN bidding_cycles bc ON d.cycle_id = bc.id
    LEFT JOIN bhishi_groups bg ON bc.group_id = bg.id
    ORDER BY d.created_at DESC
  `, (err, disputes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(disputes);
  });
});

// Resolve dispute
router.post('/disputes/:disputeId/resolve', [
  body('adminResponse').notEmpty().withMessage('Admin response is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { disputeId } = req.params;
  const { adminResponse, status } = req.body;
  const db = getDb();

  db.run(
    'UPDATE disputes SET admin_response = ?, status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
    [adminResponse, status || 'resolved', disputeId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to resolve dispute' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Dispute not found' });
      }
      res.json({ message: 'Dispute resolved successfully' });
    }
  );
});

// Get video verifications pending approval
router.get('/video-verifications', (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let query = `
    SELECT 
      v.*,
      u.full_name as user_name,
      u.email,
      bc.cycle_number,
      bg.name as group_name,
      verifier.full_name as verified_by_name
    FROM video_verifications v
    INNER JOIN users u ON v.user_id = u.id
    INNER JOIN bidding_cycles bc ON v.cycle_id = bc.id
    INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
    LEFT JOIN users verifier ON v.verified_by = verifier.id
  `;

  const params = [];
  if (status) {
    query += ' WHERE v.verification_status = ?';
    params.push(status);
  }

  query += ' ORDER BY v.created_at DESC';

  db.all(query, params, (err, verifications) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(verifications);
  });
});

module.exports = router;

