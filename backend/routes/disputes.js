const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Create dispute
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, cycleId } = req.body;
  const db = getDb();

  db.run(
    'INSERT INTO disputes (cycle_id, user_id, title, description) VALUES (?, ?, ?, ?)',
    [cycleId || null, req.user.id, title, description],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create dispute' });
      }

      res.status(201).json({
        message: 'Dispute created successfully',
        dispute: {
          id: this.lastID,
          title,
          description,
          cycleId: cycleId || null
        }
      });
    }
  );
});

// Get user's disputes
router.get('/my-disputes', (req, res) => {
  const db = getDb();
  db.all(`
    SELECT 
      d.*,
      bc.cycle_number,
      bg.name as group_name
    FROM disputes d
    LEFT JOIN bidding_cycles bc ON d.cycle_id = bc.id
    LEFT JOIN bhishi_groups bg ON bc.group_id = bg.id
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC
  `, [req.user.id], (err, disputes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(disputes);
  });
});

module.exports = router;

