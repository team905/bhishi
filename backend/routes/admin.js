const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getFirestore, db } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkGroupCompletion } = require('../utils/groupCompletion');
const admin = require('firebase-admin');

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

    try {
      // Check if username or email already exists
      const existingByUsername = await db.getByField('users', 'username', username);
      const existingByEmail = await db.getByField('users', 'email', email);
      
      if (existingByUsername || existingByEmail) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await db.create('users', {
        username,
        email,
        password: hashedPassword,
        full_name: fullName,
        phone: phone || null,
        role: 'user',
        is_active: true,
        password_changed: false,
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username,
          email,
          fullName,
          phone
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: `Failed to create user: ${error.message}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.getAll('users', [], { field: 'created_at', direction: 'desc' });
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { id } = req.params;
  const { email, fullName, phone, isActive } = req.body;

  try {
    const updateData = {};
    if (email) updateData.email = email;
    if (fullName) updateData.full_name = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.is_active = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update('users', id, updateData);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Create Bhishi group
router.post('/bhishi-groups', [
  body('name').notEmpty().withMessage('Group name is required'),
  body('contributionAmount').isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive'),
  body('totalMembers').isInt({ min: 2 }).withMessage('Total members must be at least 2')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { name, description, contributionAmount, totalMembers, cycleDurationDays, maxBidReductionPercentage } = req.body;

  try {
    const newGroup = await db.create('bhishi_groups', {
      name,
      description: description || null,
      contribution_amount: contributionAmount,
      total_members: totalMembers,
      cycle_duration_days: cycleDurationDays || 30,
      max_bid_reduction_percentage: maxBidReductionPercentage || 40,
      created_by: req.user.id,
      current_cycle: 1,
      status: 'active',
    });

    res.status(201).json({
      message: 'Bhishi group created successfully',
      group: {
        id: newGroup.id,
        name,
        description,
        contributionAmount,
        totalMembers,
        cycleDurationDays: cycleDurationDays || 30,
        maxBidReductionPercentage: maxBidReductionPercentage || 40
      }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create bhishi group' });
  }
});

// Get all bhishi groups
router.get('/bhishi-groups', async (req, res) => {
  try {
    const groups = await db.getAll('bhishi_groups', [], { field: 'created_at', direction: 'desc' });
    
    // Get member counts and creator names
    const groupsWithDetails = await Promise.all(groups.map(async (group) => {
      // Get creator name
      const creator = await db.getById('users', group.created_by);
      
      // Get member count
      const members = await db.getAll('group_members', [
        { field: 'group_id', operator: '==', value: group.id }
      ]);
      
      return {
        ...group,
        created_by_name: creator ? creator.full_name : null,
        current_members: members.length
      };
    }));
    
    res.json(groupsWithDetails);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update bhishi group (only before first cycle completes)
router.put('/bhishi-groups/:groupId', [
  body('name').optional().notEmpty().withMessage('Group name cannot be empty'),
  body('contributionAmount').optional().isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive'),
  body('totalMembers').optional().isInt({ min: 2 }).withMessage('Total members must be at least 2'),
  body('maxBidReductionPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Max bid reduction must be between 0 and 100')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId } = req.params;
  const { name, description, contributionAmount, totalMembers, cycleDurationDays, maxBidReductionPercentage } = req.body;

  try {
    // Check if group exists and has any completed cycles
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check for completed cycles
    const completedCycles = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'status', operator: '==', value: 'closed' }
    ]);

    if (group.status === 'completed' || completedCycles.length > 0) {
      return res.status(400).json({ error: 'Cannot edit group after first bidding cycle has been completed' });
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (contributionAmount !== undefined) updateData.contribution_amount = contributionAmount;
    if (totalMembers !== undefined) updateData.total_members = totalMembers;
    if (cycleDurationDays !== undefined) updateData.cycle_duration_days = cycleDurationDays;
    if (maxBidReductionPercentage !== undefined) updateData.max_bid_reduction_percentage = maxBidReductionPercentage;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update('bhishi_groups', groupId, updateData);
    res.json({ message: 'Group updated successfully' });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete bhishi group (only before first cycle completes)
router.delete('/bhishi-groups/:groupId', async (req, res) => {
  const { groupId } = req.params;

  try {
    // Check if group exists and has any completed cycles
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check for completed cycles
    const completedCycles = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'status', operator: '==', value: 'closed' }
    ]);

    if (group.status === 'completed' || completedCycles.length > 0) {
      return res.status(400).json({ error: 'Cannot delete group after first bidding cycle has been completed' });
    }

    // Check if group has any cycles (even open ones)
    const allCycles = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId }
    ]);

    if (allCycles.length > 0) {
      return res.status(400).json({ error: 'Cannot delete group that has bidding cycles. Please delete cycles first.' });
    }

    // Delete group members
    await db.deleteMany('group_members', [
      { field: 'group_id', operator: '==', value: groupId }
    ]);

    // Delete the group
    await db.delete('bhishi_groups', groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Add member to group
router.post('/bhishi-groups/:groupId/members', [
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    // Check if group exists and get member limit
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check current member count
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId }
    ]);

    if (members.length >= group.total_members) {
      return res.status(400).json({ error: 'Group is full' });
    }

    // Check if user is already a member
    const existingMember = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'user_id', operator: '==', value: userId }
    ]);

    if (existingMember.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add member
    await db.create('group_members', {
      group_id: groupId,
      user_id: userId,
    });

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
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

  try {
    // Check if user exists
    const user = await db.getById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and reset password_changed flag (user must change on next login)
    await db.update('users', userId, {
      password: hashedPassword,
      password_changed: false
    });

    res.json({ 
      message: `Password reset successfully for user: ${user.username}. User will be required to change password on next login.` 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Remove member from group
router.delete('/bhishi-groups/:groupId/members/:userId', async (req, res) => {
  const { groupId, userId } = req.params;

  try {
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'user_id', operator: '==', value: userId }
    ]);

    if (members.length === 0) {
      return res.status(404).json({ error: 'Member not found in group' });
    }

    await db.delete('group_members', members[0].id);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Create bidding cycle
router.post('/bidding-cycles', [
  body('groupId').notEmpty().withMessage('Group ID is required'),
  body('biddingStartDate').notEmpty().withMessage('Bidding start date is required'),
  body('biddingEndDate').notEmpty().withMessage('Bidding end date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { groupId, biddingStartDate, biddingEndDate, sendNotifications } = req.body;
  const notificationService = require('../services/notificationService');

  try {
    // Get current cycle number and group details
    const group = await db.getById('bhishi_groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.status === 'completed') {
      return res.status(400).json({ error: 'This bhishi group is completed. All members have received the bhishi amount. No further cycles can be created.' });
    }

    // Check if cycle number already exists
    const existingCycle = await db.getAll('bidding_cycles', [
      { field: 'group_id', operator: '==', value: groupId },
      { field: 'cycle_number', operator: '==', value: group.current_cycle }
    ]);

    if (existingCycle.length > 0) {
      return res.status(400).json({ error: `Cycle #${group.current_cycle} already exists for this group` });
    }

    const cycleNumber = group.current_cycle;
    const totalPoolAmount = group.contribution_amount * group.total_members;

    // Create bidding cycle
    const newCycle = await db.create('bidding_cycles', {
      group_id: groupId,
      cycle_number: cycleNumber,
      bidding_start_date: biddingStartDate,
      bidding_end_date: biddingEndDate,
      total_pool_amount: totalPoolAmount,
      status: 'open',
    });

    // Get all members
    const members = await db.getAll('group_members', [
      { field: 'group_id', operator: '==', value: groupId }
    ]);

    if (members.length === 0) {
      return res.status(400).json({ error: 'Group has no members. Please add members before creating a bidding cycle.' });
    }

    // Create contribution records for all members
    const firestore = getFirestore();
    const batch = firestore.batch();
    
    members.forEach(member => {
      const contributionRef = firestore.collection('contributions').doc();
      batch.set(contributionRef, {
        cycle_id: newCycle.id,
        user_id: member.user_id,
        amount: group.contribution_amount,
        payable_amount: group.contribution_amount,
        payment_status: 'pending',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Send notifications if requested (async, don't wait)
    if (sendNotifications !== false) {
      notificationService.notifyBiddingCycle(newCycle.id).catch(notifError => {
        console.error('Failed to send notifications:', notifError);
      });
    }

    res.status(201).json({
      message: 'Bidding cycle created successfully',
      cycle: {
        id: newCycle.id,
        groupId,
        cycleNumber,
        biddingStartDate,
        biddingEndDate,
        totalPoolAmount
      }
    });
  } catch (error) {
    console.error('Error creating bidding cycle:', error);
    res.status(500).json({ error: `Failed to create bidding cycle: ${error.message}` });
  }
});

// Get all bidding cycles
router.get('/bidding-cycles', async (req, res) => {
  try {
    const { groupId } = req.query;
    
    let cycles = await db.getAll('bidding_cycles', 
      groupId ? [{ field: 'group_id', operator: '==', value: groupId }] : [],
      { field: 'created_at', direction: 'desc' }
    );

    // Enrich with related data
    const enrichedCycles = await Promise.all(cycles.map(async (cycle) => {
      const group = await db.getById('bhishi_groups', cycle.group_id);
      const winner = cycle.winner_user_id ? await db.getById('users', cycle.winner_user_id) : null;
      
      // Get agreement
      const agreements = await db.getAll('agreements', [
        { field: 'cycle_id', operator: '==', value: cycle.id },
        { field: 'user_id', operator: '==', value: cycle.winner_user_id }
      ]);
      
      // Get video verification
      const verifications = await db.getAll('video_verifications', [
        { field: 'cycle_id', operator: '==', value: cycle.id },
        { field: 'user_id', operator: '==', value: cycle.winner_user_id }
      ]);

      return {
        ...cycle,
        group_name: group ? group.name : null,
        winner_name: winner ? winner.full_name : null,
        agreement_signed: agreements.length > 0 ? agreements[0].signed_at : null,
        verification_status: verifications.length > 0 ? verifications[0].verification_status : null,
        verified_at: verifications.length > 0 ? verifications[0].verified_at : null,
      };
    }));

    res.json(enrichedCycles);
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Approve winner payout
router.post('/bidding-cycles/:cycleId/approve-payout', async (req, res) => {
  const { cycleId } = req.params;

  try {
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (!cycle.winner_user_id) {
      return res.status(400).json({ error: 'Cycle has no winner yet' });
    }

    // Check if agreement is signed
    const agreements = await db.getAll('agreements', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: cycle.winner_user_id }
    ]);

    if (agreements.length === 0 || !agreements[0].signed_at) {
      return res.status(400).json({ 
        error: 'Cannot approve payout. Winner has not signed the agreement yet.' 
      });
    }

    // Check if video is verified
    const verifications = await db.getAll('video_verifications', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: cycle.winner_user_id }
    ]);

    if (verifications.length === 0 || verifications[0].verification_status !== 'approved') {
      return res.status(400).json({ 
        error: 'Cannot approve payout. Video verification is not approved yet.' 
      });
    }

    // Approve payout
    await db.update('bidding_cycles', cycleId, {
      admin_approved: true,
      payout_date: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update group current cycle
    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (group) {
      await db.update('bhishi_groups', cycle.group_id, {
        current_cycle: (group.current_cycle || 1) + 1
      });
      
      // Check if all members have won
      checkGroupCompletion(cycle.group_id);
    }

    res.json({ message: 'Payout approved successfully' });
  } catch (error) {
    console.error('Error approving payout:', error);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

// Get all disputes
router.get('/disputes', async (req, res) => {
  try {
    const disputes = await db.getAll('disputes', [], { field: 'created_at', direction: 'desc' });
    
    // Enrich with related data
    const enrichedDisputes = await Promise.all(disputes.map(async (dispute) => {
      const user = await db.getById('users', dispute.user_id);
      let cycle = null;
      let group = null;
      
      if (dispute.cycle_id) {
        cycle = await db.getById('bidding_cycles', dispute.cycle_id);
        if (cycle) {
          group = await db.getById('bhishi_groups', cycle.group_id);
        }
      }

      return {
        ...dispute,
        user_name: user ? user.full_name : null,
        cycle_number: cycle ? cycle.cycle_number : null,
        group_name: group ? group.name : null,
      };
    }));

    res.json(enrichedDisputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Resolve dispute
router.post('/disputes/:disputeId/resolve', [
  body('adminResponse').notEmpty().withMessage('Admin response is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { disputeId } = req.params;
  const { adminResponse, status } = req.body;

  try {
    await db.update('disputes', disputeId, {
      admin_response: adminResponse,
      status: status || 'resolved',
      resolved_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Dispute resolved successfully' });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Get video verifications pending approval
router.get('/video-verifications', async (req, res) => {
  try {
    const { status } = req.query;
    
    let verifications = await db.getAll('video_verifications',
      status ? [{ field: 'verification_status', operator: '==', value: status }] : [],
      { field: 'created_at', direction: 'desc' }
    );

    // Enrich with related data
    const enrichedVerifications = await Promise.all(verifications.map(async (verification) => {
      const user = await db.getById('users', verification.user_id);
      const cycle = await db.getById('bidding_cycles', verification.cycle_id);
      const group = cycle ? await db.getById('bhishi_groups', cycle.group_id) : null;
      const verifier = verification.verified_by ? await db.getById('users', verification.verified_by) : null;

      return {
        ...verification,
        user_name: user ? user.full_name : null,
        email: user ? user.email : null,
        cycle_number: cycle ? cycle.cycle_number : null,
        group_name: group ? group.name : null,
        verified_by_name: verifier ? verifier.full_name : null,
      };
    }));

    res.json(enrichedVerifications);
  } catch (error) {
    console.error('Error fetching verifications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
