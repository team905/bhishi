const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getFirestore, db } = require('../config/database');
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

    try {
      // Find user by username and active status
      const user = await db.getByField('users', 'username', username);
      
      if (!user || !user.is_active) {
        console.log('Login attempt failed: User not found or inactive -', username);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

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
          requiresPasswordChange: user.password_changed === false || user.password_changed === 0
        },
        requiresPasswordChange: user.password_changed === false || user.password_changed === 0
      });
    } catch (error) {
      console.error('Database error during login:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.getById('users', req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      requiresPasswordChange: user.password_changed === false || user.password_changed === 0
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error' });
  }
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
    const userId = req.user.id;

    try {
      // Get user with password
      const user = await db.getById('users', userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and set password_changed to true
      await db.update('users', userId, {
        password: hashedPassword,
        password_changed: true
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
