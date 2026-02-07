import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import Modal from '../Modal';

function BiddingManagement() {
  const [cycles, setCycles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [editingCycle, setEditingCycle] = useState(null);
  const [formData, setFormData] = useState({
    groupId: '',
    biddingStartDate: '',
    biddingEndDate: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCycles();
    fetchGroups();
  }, []);

  const fetchCycles = async () => {
    try {
      const response = await axios.get(getApiUrl('/admin/bidding-cycles'));
      setCycles(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bidding cycles' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(getApiUrl('/admin/bhishi-groups'));
      setGroups(response.data.filter(g => g.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch groups');
    }
  };

  const handleCreateCycle = () => {
    setFormData({
      groupId: '',
      biddingStartDate: '',
      biddingEndDate: ''
    });
    setEditingCycle(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.post(getApiUrl('/admin/bidding-cycles'), {
        groupId: parseInt(formData.groupId),
        biddingStartDate: formData.biddingStartDate,
        biddingEndDate: formData.biddingEndDate
      });

      setMessage({ type: 'success', text: 'Bidding cycle created successfully' });
      setShowModal(false);
      fetchCycles();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Bidding cycle creation error:', error);
      let errorMessage = 'Failed to create bidding cycle';
      
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

  const handleCloseCycle = async (cycleId) => {
    if (!window.confirm('Are you sure you want to close this bidding cycle? This will determine the winner.')) return;

    try {
      await axios.post(`/api/bidding/cycles/${cycleId}/close`);
      setMessage({ type: 'success', text: 'Bidding cycle closed successfully' });
      fetchCycles();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to close cycle' });
    }
  };

  const handleApprovePayout = async (cycleId) => {
    if (!window.confirm('Approve payout for the winner?')) return;

    try {
      await axios.post(`/api/admin/bidding-cycles/${cycleId}/approve-payout`);
      setMessage({ type: 'success', text: 'Payout approved successfully' });
      fetchCycles();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve payout' });
    }
  };

  const handleViewBids = async (cycle) => {
    setSelectedCycle(cycle);
    try {
      const response = await axios.get(`/api/bidding/cycles/${cycle.id}/bids`);
      setSelectedCycle({ ...cycle, bids: response.data });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bids' });
    }
  };

  const handleEditCycle = (cycle) => {
    setEditingCycle(cycle);
    // Format dates for input (YYYY-MM-DDTHH:mm)
    const startDate = new Date(cycle.bidding_start_date).toISOString().slice(0, 16);
    const endDate = new Date(cycle.bidding_end_date).toISOString().slice(0, 16);
    setFormData({
      groupId: cycle.group_id,
      biddingStartDate: startDate,
      biddingEndDate: endDate
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.put(`/api/admin/bidding-cycles/${editingCycle.id}`, {
        biddingStartDate: formData.biddingStartDate,
        biddingEndDate: formData.biddingEndDate
      });

      setMessage({ type: 'success', text: 'Bidding cycle updated successfully' });
      setShowEditModal(false);
      setEditingCycle(null);
      fetchCycles();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update bidding cycle' });
    }
  };

  const canEditCycle = (cycle) => {
    if (cycle.status !== 'open') return false;
    const now = new Date();
    const startDate = new Date(cycle.bidding_start_date);
    return now < startDate;
  };

  if (loading) return <div className="loading">Loading bidding cycles...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
          <span className="icon">🎯</span> Bidding Cycles Management
        </h2>
        <button className="btn btn-primary" onClick={handleCreateCycle}>
          <span className="icon">➕</span> Create Bidding Cycle
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
                <th>Group</th>
                <th>Cycle #</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Pool Amount</th>
                <th>Status</th>
                <th>Winner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>No bidding cycles found</td>
                </tr>
              ) : (
                cycles.map(cycle => (
                  <tr key={cycle.id}>
                    <td>{cycle.group_name}</td>
                    <td>{cycle.cycle_number}</td>
                    <td>{new Date(cycle.bidding_start_date).toLocaleDateString()}</td>
                    <td>{new Date(cycle.bidding_end_date).toLocaleDateString()}</td>
                    <td>₹{cycle.total_pool_amount}</td>
                    <td>
                      <span className={`badge ${
                        cycle.status === 'open' ? 'badge-success' :
                        cycle.status === 'closed' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {cycle.status}
                      </span>
                    </td>
                    <td>
                      {cycle.winner_name ? (
                        <div>
                          <div>{cycle.winner_name}</div>
                          {cycle.is_random_winner ? (
                            <div style={{ fontSize: '12px', color: '#ff9800' }}>
                              <span className="badge badge-warning">Random Winner (No Bids)</span>
                            </div>
                          ) : cycle.winning_bid_amount !== null && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Bid: ₹{cycle.winning_bid_amount}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {cycle.status === 'open' && (
                        <>
                          {canEditCycle(cycle) && (
                            <button
                              className="btn btn-secondary"
                              style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => handleEditCycle(cycle)}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => handleViewBids(cycle)}
                          >
                            View Bids
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => handleCloseCycle(cycle.id)}
                          >
                            Close
                          </button>
                        </>
                      )}
                      {cycle.status === 'closed' && !cycle.admin_approved && (
                        <>
                          <div style={{ marginBottom: '5px', fontSize: '12px' }}>
                            {!cycle.agreement_signed && (
                              <span className="badge badge-warning" style={{ marginRight: '5px' }}>
                                Agreement Pending
                              </span>
                            )}
                            {cycle.agreement_signed && cycle.verification_status !== 'approved' && (
                              <span className="badge badge-warning" style={{ marginRight: '5px' }}>
                                Video Pending
                              </span>
                            )}
                          </div>
                          {cycle.agreement_signed && cycle.verification_status === 'approved' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => handleApprovePayout(cycle.id)}
                            >
                              Approve Payout
                            </button>
                          )}
                          {(!cycle.agreement_signed || cycle.verification_status !== 'approved') && (
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>
                              Waiting for Verification
                            </span>
                          )}
                        </>
                      )}
                      {cycle.admin_approved && (
                        <span className="badge badge-success">Payout Approved</span>
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
          <h2>Create Bidding Cycle</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Group</label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                required
              >
                <option value="">Select a group</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} (₹{group.contribution_amount})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Bidding Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.biddingStartDate}
                onChange={(e) => setFormData({ ...formData, biddingStartDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Bidding End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.biddingEndDate}
                onChange={(e) => setFormData({ ...formData, biddingEndDate: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && editingCycle && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h2>Edit Bidding Cycle - {editingCycle.group_name} Cycle #{editingCycle.cycle_number}</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Bidding Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.biddingStartDate}
                onChange={(e) => setFormData({ ...formData, biddingStartDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Bidding End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.biddingEndDate}
                onChange={(e) => setFormData({ ...formData, biddingEndDate: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Update</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedCycle && selectedCycle.bids && (
        <Modal onClose={() => setSelectedCycle(null)}>
          <h2>Bids for Cycle #{selectedCycle.cycle_number} - {selectedCycle.group_name}</h2>
          <div style={{ marginTop: '20px' }}>
            {selectedCycle.bids.length === 0 ? (
              <p>No bids placed yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Bid Amount</th>
                    <th>Bid Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCycle.bids.map(bid => (
                    <tr key={bid.id}>
                      <td>{bid.full_name} ({bid.username})</td>
                      <td>₹{bid.bid_amount}</td>
                      <td>{new Date(bid.bid_time).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedCycle(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BiddingManagement;

