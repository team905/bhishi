import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ChangePassword.css';

function ChangePassword() {
  const [searchParams] = useSearchParams();
  const isFirstTime = searchParams.get('firstTime') === 'true';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      if (isFirstTime) {
        // Redirect to appropriate dashboard after first-time password change
        navigate('/dashboard');
      } else {
        // Show success message and allow user to continue
        // Success is already shown via the result, just navigate back
        setTimeout(() => {
          navigate(-1); // Go back to previous page
        }, 1500); // Give time to see the success message
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h1>
            <span style={{ fontSize: '36px' }}>🔐</span>
            {isFirstTime ? 'Change Your Password' : 'Change Password'}
          </h1>
          {isFirstTime && (
            <p style={{ color: '#ff9800', fontWeight: '600' }}>
              ⚠️ You must change your password before continuing
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter your current password"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter your new password (min 6 characters)"
              minLength={6}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Password must be at least 6 characters long
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your new password"
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary change-password-btn" disabled={loading}>
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
          {!isFirstTime && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              style={{ marginTop: '10px' }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;

