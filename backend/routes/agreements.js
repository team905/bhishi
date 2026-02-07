const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get agreement for a cycle (winner only)
router.get('/cycles/:cycleId', (req, res) => {
  const { cycleId } = req.params;
  const db = getDb();

  // Check if user is the winner and get user details
  db.get(`
    SELECT bc.winner_user_id, bc.status, bc.winning_bid_amount, bc.total_pool_amount,
           bg.name as group_name, bc.cycle_number
    FROM bidding_cycles bc
    INNER JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE bc.id = ?
  `, [cycleId], (err, cycle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.winner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the winner of this cycle' });
    }

    // Get user details
    db.get('SELECT full_name, username, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get existing agreement if any
      db.get('SELECT * FROM agreements WHERE cycle_id = ? AND user_id = ?', [cycleId, req.user.id], (err, agreement) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const userName = user?.full_name || user?.username || req.user.username;
        const userEmail = user?.email || req.user.email || '';

        const agreementText = `AGREEMENT FOR BHISHI WINNER

I, ${userName}, hereby agree to the following terms and conditions for winning the Bhishi amount:

1. I acknowledge that I have won the Bhishi for ${cycle.group_name} - Cycle #${cycle.cycle_number}
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
            groupName: cycle.group_name,
            cycleNumber: cycle.cycle_number,
            winningBidAmount: cycle.winning_bid_amount,
            totalPoolAmount: cycle.total_pool_amount,
            payoutAmount: cycle.total_pool_amount - cycle.winning_bid_amount
          },
          agreement: agreement || null,
          agreementText: agreementText
        });
      });
    });
  });
});

// Sign agreement
router.post('/sign', [
  body('cycleId').isInt().withMessage('Cycle ID is required'),
  body('signatureData').notEmpty().withMessage('Signature is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { cycleId, signatureData } = req.body;
  const db = getDb();

  // Verify user is the winner
  db.get('SELECT winner_user_id, status FROM bidding_cycles WHERE id = ?', [cycleId], (err, cycle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
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
    db.get('SELECT id FROM agreements WHERE cycle_id = ? AND user_id = ?', [cycleId, req.user.id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (existing) {
        return res.status(400).json({ error: 'Agreement already signed' });
      }

      // Create agreement record
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      db.run(
        `INSERT INTO agreements (cycle_id, user_id, agreement_text, signature_data, signed_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [cycleId, req.user.id, '', signatureData, ipAddress, userAgent],
        function(err) {
          if (err) {
            console.error('Error creating agreement:', err);
            return res.status(500).json({ error: 'Failed to sign agreement' });
          }

          res.json({
            message: 'Agreement signed successfully',
            agreementId: this.lastID
          });
        }
      );
    });
  });
});

module.exports = router;

