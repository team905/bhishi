const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get video verification status for a cycle (winner only)
router.get('/cycles/:cycleId', (req, res) => {
  const { cycleId } = req.params;
  const db = getDb();

  // Check if user is the winner
  db.get('SELECT winner_user_id, status FROM bidding_cycles WHERE id = ?', [cycleId], (err, cycle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.winner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the winner of this cycle' });
    }

    // Get existing verification if any
    db.get('SELECT * FROM video_verifications WHERE cycle_id = ? AND user_id = ?', [cycleId, req.user.id], (err, verification) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        verification: verification || null,
        canUpload: cycle.status === 'closed' && (!verification || verification.verification_status === 'pending')
      });
    });
  });
});

// Upload video verification
router.post('/upload', [
  body('cycleId').isInt().withMessage('Cycle ID is required'),
  body('videoUrl').notEmpty().withMessage('Video URL is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { cycleId, videoUrl, notes } = req.body;
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

    // Check if verification already exists
    db.get('SELECT id FROM video_verifications WHERE cycle_id = ? AND user_id = ?', [cycleId, req.user.id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        // Update existing verification
        db.run(
          'UPDATE video_verifications SET video_url = ?, notes = ?, verification_status = ? WHERE cycle_id = ? AND user_id = ?',
          [videoUrl, notes || null, 'pending', cycleId, req.user.id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update video verification' });
            }
            res.json({ message: 'Video verification updated successfully' });
          }
        );
      } else {
        // Create new verification
        db.run(
          'INSERT INTO video_verifications (cycle_id, user_id, video_url, notes, verification_status) VALUES (?, ?, ?, ?, ?)',
          [cycleId, req.user.id, videoUrl, notes || null, 'pending'],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to upload video verification' });
            }
            res.json({
              message: 'Video verification uploaded successfully',
              verificationId: this.lastID
            });
          }
        );
      }
    });
  });
});

// Admin: Approve/reject video verification
router.post('/:verificationId/verify', [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional()
], (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can verify videos' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { verificationId } = req.params;
  const { status, notes } = req.body;
  const db = getDb();

  db.run(
    'UPDATE video_verifications SET verification_status = ?, verified_at = CURRENT_TIMESTAMP, verified_by = ?, notes = ? WHERE id = ?',
    [status, req.user.id, notes || null, verificationId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update verification status' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Verification not found' });
      }
      res.json({ message: `Video verification ${status} successfully` });
    }
  );
});

module.exports = router;

