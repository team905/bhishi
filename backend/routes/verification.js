const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const admin = require('firebase-admin');

const router = express.Router();

router.use(authenticate);

// Get video verification status for a cycle (winner only)
router.get('/cycles/:cycleId', async (req, res) => {
  const { cycleId } = req.params;

  try {
    // Check if user is the winner
    const cycle = await db.getById('bidding_cycles', cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    if (cycle.winner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not the winner of this cycle' });
    }

    // Get existing verification if any
    const verifications = await db.getAll('video_verifications', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    const verification = verifications.length > 0 ? verifications[0] : null;

    res.json({
      verification: verification || null,
      canUpload: cycle.status === 'closed' && (!verification || verification.verification_status === 'pending')
    });
  } catch (error) {
    console.error('Error fetching verification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Upload video verification
router.post('/upload', [
  body('cycleId').notEmpty().withMessage('Cycle ID is required'),
  body('videoUrl').notEmpty().withMessage('Video URL is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(e => e.msg).join(', ');
    return res.status(400).json({ error: errorMessages, errors: errors.array() });
  }

  const { cycleId, videoUrl, notes } = req.body;

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

    // Check if verification already exists
    const existing = await db.getAll('video_verifications', [
      { field: 'cycle_id', operator: '==', value: cycleId },
      { field: 'user_id', operator: '==', value: req.user.id }
    ]);

    if (existing.length > 0) {
      // Update existing verification
      await db.update('video_verifications', existing[0].id, {
        video_url: videoUrl,
        notes: notes || null,
        verification_status: 'pending',
      });
      res.json({ message: 'Video verification updated successfully' });
    } else {
      // Create new verification
      const newVerification = await db.create('video_verifications', {
        cycle_id: cycleId,
        user_id: req.user.id,
        video_url: videoUrl,
        notes: notes || null,
        verification_status: 'pending',
      });
      res.json({
        message: 'Video verification uploaded successfully',
        verificationId: newVerification.id
      });
    }
  } catch (error) {
    console.error('Error uploading verification:', error);
    res.status(500).json({ error: 'Failed to upload video verification' });
  }
});

// Admin: Approve/reject video verification
router.post('/:verificationId/verify', [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional()
], async (req, res) => {
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

  try {
    await db.update('video_verifications', verificationId, {
      verification_status: status,
      verified_at: admin.firestore.FieldValue.serverTimestamp(),
      verified_by: req.user.id,
      notes: notes || null,
    });

    res.json({ message: `Video verification ${status} successfully` });
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

module.exports = router;
