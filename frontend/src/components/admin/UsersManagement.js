import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import Modal from '../Modal';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(getApiUrl('/admin/users'));
      setUsers(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      fullName: '',
      phone: ''
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.full_name,
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      if (editingUser) {
        await axios.put(getApiUrl(`/admin/users/${editingUser.id}`), {
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          isActive: formData.isActive !== undefined ? formData.isActive : editingUser.is_active
        });

        if (formData.password) {
          await axios.post(getApiUrl(`/admin/users/${editingUser.id}/reset-password`), {
            newPassword: formData.password
          });
        }

        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        await axios.post(getApiUrl('/admin/users'), formData);
        setMessage({ type: 'success', text: 'User created successfully' });
      }

      setShowModal(false);
      fetchUsers();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('User operation error:', error);
      let errorMessage = 'Operation failed';
      
      if (error.response?.data) {
        // Handle validation errors array
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map(e => e.msg || e.message).join(', ');
        } else {
          errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      await axios.put(getApiUrl(`/admin/users/${user.id}`), {
        isActive: !user.is_active
      });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user status' });
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setResetPassword('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (resetPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      await axios.post(getApiUrl(`/admin/users/${selectedUser.id}/reset-password`), {
        newPassword: resetPassword
      });
      setMessage({ type: 'success', text: 'Password reset successfully. User will be required to change password on next login.' });
      setShowResetPasswordModal(false);
      fetchUsers();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to reset password';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
          <span className="icon">👤</span> Users Management
        </h2>
        <button className="btn btn-primary" onClick={handleCreateUser}>
          <span className="icon">➕</span> Create User
        </button>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No users found</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleEditUser(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-warning"
                        style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleResetPassword(user)}
                      >
                        <span className="icon">🔑</span> Reset Password
                      </button>
                      <button
                        className={`btn ${user.is_active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => toggleUserStatus(user)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required={!editingUser}
                disabled={!!editingUser}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Password {editingUser && '(leave empty to keep current)'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            {editingUser && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive !== undefined ? formData.isActive : editingUser.is_active}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  {' '}Active
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showResetPasswordModal && selectedUser && (
        <Modal onClose={() => setShowResetPasswordModal(false)}>
          <h2>Reset Password for {selectedUser.full_name}</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            The user will be required to change this password on their next login.
          </p>
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter new password (min 6 characters)"
              />
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Password must be at least 6 characters long
              </small>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">
                Reset Password
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowResetPasswordModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default UsersManagement;

