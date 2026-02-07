import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../Modal';

function VideoVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    status: 'approved',
    notes: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await axios.get('/api/admin/video-verifications');
      setVerifications(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch video verifications' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (verification) => {
    setSelectedVerification(verification);
    setVerifyForm({
      status: 'approved',
      notes: ''
    });
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`/api/verification/${selectedVerification.id}/verify`, verifyForm);
      setMessage({ type: 'success', text: `Video verification ${verifyForm.status} successfully` });
      setSelectedVerification(null);
      fetchVerifications();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to verify video' });
    }
  };

  if (loading) return <div className="loading">Loading video verifications...</div>;

  const pendingVerifications = verifications.filter(v => v.verification_status === 'pending');
  const approvedVerifications = verifications.filter(v => v.verification_status === 'approved');
  const rejectedVerifications = verifications.filter(v => v.verification_status === 'rejected');

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
        <span className="icon">🎥</span> Video Verifications
      </h2>

      {message.text && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stats-card">
          <h3>Pending</h3>
          <div className="value">{pendingVerifications.length}</div>
        </div>
        <div className="stats-card">
          <h3>Approved</h3>
          <div className="value">{approvedVerifications.length}</div>
        </div>
        <div className="stats-card">
          <h3>Rejected</h3>
          <div className="value">{rejectedVerifications.length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: '#2d3748', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          <span className="icon">⏳</span> Pending Verifications
        </h3>
        {pendingVerifications.length === 0 ? (
          <p style={{ padding: '20px', color: '#999' }}>No pending verifications</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Group</th>
                  <th>Cycle #</th>
                  <th>Video</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.map(verification => (
                  <tr key={verification.id}>
                    <td>
                      <div>
                        <strong>{verification.user_name}</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>{verification.email}</div>
                      </div>
                    </td>
                    <td>{verification.group_name}</td>
                    <td>{verification.cycle_number}</td>
                    <td>
                      {verification.video_url ? (
                        <a href={verification.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                          Watch Video
                        </a>
                      ) : (
                        <span style={{ color: '#999' }}>No video</span>
                      )}
                    </td>
                    <td>{new Date(verification.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleVerify(verification)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVerification && (
        <Modal onClose={() => setSelectedVerification(null)}>
          <h2>Review Video Verification</h2>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>User:</strong> {selectedVerification.user_name}</p>
            <p><strong>Group:</strong> {selectedVerification.group_name}</p>
            <p><strong>Cycle:</strong> #{selectedVerification.cycle_number}</p>
            {selectedVerification.video_url && (
              <div style={{ marginTop: '15px' }}>
                <a href={selectedVerification.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  Watch Video
                </a>
              </div>
            )}
            {selectedVerification.notes && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                <strong>User Notes:</strong>
                <p>{selectedVerification.notes}</p>
              </div>
            )}
          </div>
          <form onSubmit={handleVerifySubmit}>
            <div className="form-group">
              <label>Verification Status</label>
              <select
                value={verifyForm.status}
                onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
                required
              >
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
            <div className="form-group">
              <label>Admin Notes (Optional)</label>
              <textarea
                value={verifyForm.notes}
                onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                rows="3"
                placeholder="Add any notes about this verification"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className={`btn ${verifyForm.status === 'approved' ? 'btn-success' : 'btn-danger'}`}>
                {verifyForm.status === 'approved' ? 'Approve' : 'Reject'} Verification
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedVerification(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default VideoVerifications;

