import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../Modal';

function GroupsManagement() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showViewMembersModal, setShowViewMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contributionAmount: '',
    totalMembers: '',
    cycleDurationDays: '30',
    maxBidReductionPercentage: '40'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/admin/bhishi-groups');
      setGroups(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch groups' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.filter(u => u.role === 'user' && u.is_active));
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleCreateGroup = () => {
    setFormData({
      name: '',
      description: '',
      contributionAmount: '',
      totalMembers: '',
      cycleDurationDays: '30',
      maxBidReductionPercentage: '40'
    });
    setEditingGroup(null);
    setShowModal(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      contributionAmount: group.contribution_amount,
      totalMembers: group.total_members,
      cycleDurationDays: group.cycle_duration_days || '30',
      maxBidReductionPercentage: group.max_bid_reduction_percentage || '40'
    });
    setShowEditModal(true);
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/bhishi-groups/${group.id}`);
      setMessage({ type: 'success', text: 'Group deleted successfully' });
      fetchGroups();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete group' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.put(`/api/admin/bhishi-groups/${editingGroup.id}`, {
        name: formData.name,
        description: formData.description,
        contributionAmount: parseFloat(formData.contributionAmount),
        totalMembers: parseInt(formData.totalMembers),
        cycleDurationDays: parseInt(formData.cycleDurationDays),
        maxBidReductionPercentage: parseFloat(formData.maxBidReductionPercentage)
      });

      setMessage({ type: 'success', text: 'Group updated successfully' });
      setShowEditModal(false);
      setEditingGroup(null);
      fetchGroups();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update group' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.post('/api/admin/bhishi-groups', {
        name: formData.name,
        description: formData.description,
        contributionAmount: parseFloat(formData.contributionAmount),
        totalMembers: parseInt(formData.totalMembers),
        cycleDurationDays: parseInt(formData.cycleDurationDays),
        maxBidReductionPercentage: parseFloat(formData.maxBidReductionPercentage)
      });

      setMessage({ type: 'success', text: 'Group created successfully' });
      setShowModal(false);
      fetchGroups();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create group' });
    }
  };

  const handleAddMember = async (group) => {
    setSelectedGroup(group);
    setShowMemberModal(true);
    
    // Fetch current members of the group to filter them out
    try {
      const response = await axios.get(`/api/bhishi/groups/${group.id}`);
      const currentMemberIds = (response.data.members || []).map(m => m.id);
      // Filter out users who are already members
      const available = users.filter(u => !currentMemberIds.includes(u.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Failed to fetch group members:', error);
      // If fetch fails, show all users (fallback)
      setAvailableUsers(users);
    }
  };

  const handleViewMembers = async (group) => {
    setSelectedGroup(group);
    setLoadingMembers(true);
    setShowViewMembersModal(true);
    
    try {
      const response = await axios.get(`/api/bhishi/groups/${group.id}`);
      setGroupMembers(response.data.members || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to fetch members' });
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const userId = form.userId.value;

    try {
      await axios.post(`/api/admin/bhishi-groups/${selectedGroup.id}/members`, {
        userId: parseInt(userId)
      });

      setMessage({ type: 'success', text: 'Member added successfully' });
      setShowMemberModal(false);
      setSelectedGroup(null);
      setAvailableUsers([]);
      fetchGroups();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add member' });
    }
  };


  if (loading) return <div className="loading">Loading groups...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
          <span className="icon">👥</span> Bhishi Groups Management
        </h2>
        <button className="btn btn-primary" onClick={handleCreateGroup}>
          <span className="icon">➕</span> Create Group
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
                <th>Name</th>
                <th>Contribution</th>
                <th>Members</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No groups found</td>
                </tr>
              ) : (
                groups.map(group => (
                  <tr key={group.id}>
                    <td>
                      <strong>{group.name}</strong>
                      {group.description && <div style={{ fontSize: '12px', color: '#666' }}>{group.description}</div>}
                    </td>
                    <td>₹{group.contribution_amount}</td>
                    <td>{group.current_members || 0} / {group.total_members}</td>
                    <td>
                      <span className={`badge ${
                        group.status === 'completed' ? 'badge-info' :
                        group.status === 'active' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {group.status === 'completed' ? 'Completed' : group.status}
                      </span>
                    </td>
                    <td>
                      {group.status === 'completed' ? (
                        <span className="badge badge-success">All Members Won</span>
                      ) : (
                        <div style={{ fontSize: '12px' }}>
                          {group.winners_count || 0} / {group.total_members} winners
                          <div style={{ width: '100px', height: '8px', background: '#e0e0e0', borderRadius: '4px', marginTop: '5px' }}>
                            <div style={{ 
                              width: `${((group.winners_count || 0) / group.total_members) * 100}%`, 
                              height: '100%', 
                              background: '#28a745', 
                              borderRadius: '4px' 
                            }}></div>
                          </div>
                        </div>
                      )}
                    </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleViewMembers(group)}
                    >
                      View Members
                    </button>
                    {group.status !== 'completed' && (
                      <>
                        <button
                          className="btn btn-secondary"
                          style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleEditGroup(group)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleDeleteGroup(group)}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleAddMember(group)}
                        >
                          Add Member
                        </button>
                      </>
                    )}
                    {group.status === 'completed' && (
                      <span style={{ fontSize: '12px', color: '#999' }}>No actions available</span>
                    )}
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
          <h2>Create Bhishi Group</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Contribution Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.contributionAmount}
                onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Total Members</label>
              <input
                type="number"
                min="2"
                value={formData.totalMembers}
                onChange={(e) => setFormData({ ...formData, totalMembers: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Cycle Duration (days)</label>
              <input
                type="number"
                min="1"
                value={formData.cycleDurationDays}
                onChange={(e) => setFormData({ ...formData, cycleDurationDays: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Max Bid Reduction Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.maxBidReductionPercentage}
                onChange={(e) => setFormData({ ...formData, maxBidReductionPercentage: e.target.value })}
                required
              />
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Maximum percentage by which users can reduce their bid. Example: 40% means minimum bid = 60% of total amount.
              </small>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && editingGroup && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h2>Edit Bhishi Group</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Contribution Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.contributionAmount}
                onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Total Members</label>
              <input
                type="number"
                min="2"
                value={formData.totalMembers}
                onChange={(e) => setFormData({ ...formData, totalMembers: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Cycle Duration (days)</label>
              <input
                type="number"
                min="1"
                value={formData.cycleDurationDays}
                onChange={(e) => setFormData({ ...formData, cycleDurationDays: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Max Bid Reduction Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.maxBidReductionPercentage}
                onChange={(e) => setFormData({ ...formData, maxBidReductionPercentage: e.target.value })}
                required
              />
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Maximum percentage by which users can reduce their bid. Example: 40% means minimum bid = 60% of total amount.
              </small>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Update</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showViewMembersModal && selectedGroup && (
        <Modal onClose={() => setShowViewMembersModal(false)}>
          <h2>Members of {selectedGroup.name}</h2>
          {loadingMembers ? (
            <div className="loading">Loading members...</div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              {groupMembers.length === 0 ? (
                <p>No members found in this group.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Joined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map(member => (
                        <tr key={member.id}>
                          <td><strong>{member.full_name}</strong></td>
                          <td>{member.username}</td>
                          <td>{member.email}</td>
                          <td>
                            {member.joined_at 
                              ? new Date(member.joined_at).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowViewMembersModal(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

          {showMemberModal && selectedGroup && (
            <Modal onClose={() => {
              setShowMemberModal(false);
              setSelectedGroup(null);
              setAvailableUsers([]);
            }}>
              <h2>Add Member to {selectedGroup.name}</h2>
              <form onSubmit={handleAddMemberSubmit}>
                <div className="form-group">
                  <label>Select User</label>
                  {availableUsers.length === 0 ? (
                    <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px', color: '#856404' }}>
                      <strong>No available users</strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                        All active users are already members of this group.
                      </p>
                    </div>
                  ) : (
                    <select name="userId" required>
                      <option value="">Select a user</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.username})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={availableUsers.length === 0}
                  >
                    Add Member
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowMemberModal(false);
                      setSelectedGroup(null);
                      setAvailableUsers([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}
    </div>
  );
}

export default GroupsManagement;

