const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const admin = require('firebase-admin');

const router = express.Router();

router.use(authenticate);

// Get agreement for a cycle (winner only)
router.get('/cycles/:cycleId', async (req, res) => {
  const { cycleId } = req.params;

  try {
    // Check if user is the winner and get cycle details
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (cycle.winner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the winner of this cycle' });
    }

    // Get group details
    const group = await db.getById('bhishi_groups', cycle.group_id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get user details
    const user = await db.getById('users', req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get existing agreement if any
    const agreements = await db.getAll('agreements', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    const agreement = agreements.length > 0 ? agreements[0] : null;

    const userName = user.full_name || user.username || req.user.username;
    const userEmail = user.email || '';

    const agreementText = `AGREEMENT FOR BHISHI WINNER

I, ${userName}, hereby agree to the following terms and conditions for winning the Bhishi amount:

1. I acknowledge that I have won the Bhishi for ${group.name} - Cycle #${cycle.cycle_number}
2. I understand that I will receive ₹${cycle.total_pool_amount - cycle.winning_bid_amount} (Total Pool: ₹${cycle.total_pool_amount} - My Bid: ₹${cycle.winning_bid_amount})
3. I agree to continue contributing ₹${cycle.winning_bid_amount} for all remaining cycles in this group
4. I understand that the profit amount (₹${cycle.winning_bid_amount}) will be distributed equally among other group members
5. I agree to complete video verification before receiving the payout
6. I understand that the payout will only be released after both agreement signing and video verification are completed

By signing this agreement, I confirm that I have read, understood, and agree to all the terms and conditions stated above.

Date: ${new Date().toLocaleDateString()}
Winner: ${userName}
Email: ${userEmail}`;

    res.json({
      cycle: {
        id: cycleId,
        groupName: group.name,
        cycleNumber: cycle.cycle_number,
        winningBidAmount: cycle.winning_bid_amount,
        totalPoolAmount: cycle.total_pool_amount,
        payoutAmount: cycle.total_pool_amount - cycle.winning_bid_amount
      },
      agreement: agreement || null,
      agreementText: agreementText
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Sign agreement
router.post('/sign', [
  body('cycleId').notEmpty().withMessage('Cycle ID is required'),
  body('signatureData').notEmpty().withMessage('Signature is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { cycleId, signatureData } = req.body;

  try {
    // Verify user is the winner
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.status !== 'closed') {
      return res.status(400).json({ error: 'Bidding cycle is not closed yet' });
    }
    if (cycle.winner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the winner of this cycle' });
    }

    // Check if already signed
    const existing = await db.getAll('agreements', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Agreement already signed' });
    }

    // Create agreement record
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const newAgreement = await db.create('agreements', {
      cycle_id: cycleId,
      user_id: req.user.id,
      agreement_text: '',
      signature_data: signatureData,
      signed_at: admin.firestore.FieldValue.serverTimestamp(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    res.json({
      message: 'Agreement signed successfully',
      agreementId: newAgreement.id
    });
  } catch (error) {
    console.error('Error signing agreement:', error);
    res.status(500).json({ error: 'Failed to sign agreement' });
  }
});

module.exports = router;
