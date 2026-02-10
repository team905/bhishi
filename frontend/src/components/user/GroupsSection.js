import React, { useState, useEffect } from 'react';
import MonthlyBiddingHistory from './MonthlyBiddingHistory';

function GroupsSection({ groups }) {
  const STORAGE_KEY = 'bhishi_selected_group_id';
  
  // Initialize from localStorage if available
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  
  // Save to sessionStorage whenever selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId) {
      sessionStorage.setItem(STORAGE_KEY, selectedGroupId.toString());
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedGroupId]);
  
  // Verify the selected group still exists when groups prop changes
  useEffect(() => {
    if (selectedGroupId) {
      const groupStillExists = groups.some(g => g.id === selectedGroupId);
      if (!groupStillExists) {
        // Group no longer exists, clear selection
        setSelectedGroupId(null);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [groups, selectedGroupId]);
  
  const handleBackToGroups = () => {
    setSelectedGroupId(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <h3>No groups found</h3>
        <p>You are not a member of any bhishi groups yet.</p>
      </div>
    );
  }

  if (selectedGroupId) {
    return (
      <div>
        <button
          className="btn btn-secondary"
          onClick={handleBackToGroups}
          style={{ marginBottom: '20px' }}
        >
          ← Back to Groups
        </button>
        <MonthlyBiddingHistory groupId={selectedGroupId} />
      </div>
    );
  }

  return (
    <div className="card">
      <h2><span className="icon">👥</span> My Bhishi Groups</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Description</th>
              <th>Contribution</th>
              <th>Members</th>
              <th>Status</th>
              <th>Current Cycle</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const isCompleted = group.status === 'completed';
              return (
                <tr key={group.id}>
                  <td><strong>{group.name}</strong></td>
                  <td>{group.description || '-'}</td>
                  <td>₹{group.contribution_amount}</td>
                  <td>{group.current_members || 0} / {group.total_members}</td>
                  <td>
                    <span className={`badge ${
                      isCompleted ? 'badge-info' :
                      group.status === 'active' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {isCompleted ? 'Completed' : group.status}
                    </span>
                  </td>
                  <td>{group.current_cycle || 1} / {group.total_members}</td>
                  <td>
                    {isCompleted ? (
                      <span className="badge badge-success">All Members Won</span>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {group.winners_count || 0} / {group.total_members} winners
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => setSelectedGroupId(group.id)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      <span className="icon">📅</span> View Monthly History
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GroupsSection;
