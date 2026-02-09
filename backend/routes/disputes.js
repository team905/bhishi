const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const admin = require('firebase-admin');

const router = express.Router();

router.use(authenticate);

// Create dispute
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, cycleId } = req.body;

  try {
    const newDispute = await db.create('disputes', {
      cycle_id: cycleId || null,
      user_id: req.user.id,
      title,
      description,
      status: 'open',
    });

    res.status(201).json({
      message: 'Dispute created successfully',
      dispute: {
        id: newDispute.id,
        title,
        description,
        cycleId: cycleId || null
      }
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// Get user's disputes
router.get('/my-disputes', async (req, res) => {
  try {
    const disputes = await db.getAll('disputes', [
      { field: 'user_id', operator: '==', value: req.user.id }
    ], { field: 'created_at', direction: 'desc' });

    // Enrich with related data
    const enrichedDisputes = await Promise.all(disputes.map(async (dispute) => {
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

module.exports = router;
