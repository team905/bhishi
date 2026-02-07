const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const db = getDb();

    db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        console.log('Login attempt failed: User not found or inactive -', username);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.log('Login attempt failed: Invalid password for user -', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '24h' }
        );

        console.log('Login successful for user:', username);
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            requiresPasswordChange: user.password_changed === 0
          },
          requiresPasswordChange: user.password_changed === 0
        });
      } catch (bcryptError) {
        console.error('Password comparison error:', bcryptError);
        return res.status(500).json({ error: 'Authentication error' });
      }
    });
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  db.get('SELECT id, username, email, full_name, role, password_changed FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      requiresPasswordChange: user.password_changed === 0
    });
  });
});

// Change password (for first-time login or regular password change)
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const db = getDb();
    const userId = req.user.id;

    // Get user with password
    db.get('SELECT password, password_changed FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // For first-time password change, currentPassword might be the default password
      // For regular password change, verify current password
      if (user.password_changed === 1) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      } else {
        // First-time login - verify against current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and set password_changed to 1
      db.run(
        'UPDATE users SET password = ?, password_changed = 1 WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update password' });
          }
          res.json({ message: 'Password changed successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
