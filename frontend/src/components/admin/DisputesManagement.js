import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../Modal';

function DisputesManagement() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    adminResponse: '',
    status: 'resolved'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const response = await axios.get('/api/admin/disputes');
      setDisputes(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch disputes' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (dispute) => {
    setSelectedDispute(dispute);
    setResolveForm({
      adminResponse: '',
      status: 'resolved'
    });
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`/api/admin/disputes/${selectedDispute.id}/resolve`, resolveForm);
      setMessage({ type: 'success', text: 'Dispute resolved successfully' });
      setSelectedDispute(null);
      fetchDisputes();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to resolve dispute' });
    }
  };

  if (loading) return <div className="loading">Loading disputes...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#2d3748', fontSize: '24px', fontWeight: '600' }}>
        <span className="icon">⚖️</span> Disputes Management
      </h2>

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
                <th>Title</th>
                <th>User</th>
                <th>Group/Cycle</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No disputes found</td>
                </tr>
              ) : (
                disputes.map(dispute => (
                  <tr key={dispute.id}>
                    <td><strong>{dispute.title}</strong></td>
                    <td>{dispute.user_name}</td>
                    <td>
                      {dispute.group_name && (
                        <div>
                          <div>{dispute.group_name}</div>
                          {dispute.cycle_number && (
                            <div style={{ fontSize: '12px', color: '#666' }}>Cycle #{dispute.cycle_number}</div>
                          )}
                        </div>
                      )}
                      {!dispute.group_name && '-'}
                    </td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dispute.description}
                    </td>
                    <td>
                      <span className={`badge ${
                        dispute.status === 'open' ? 'badge-warning' :
                        dispute.status === 'resolved' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td>{new Date(dispute.created_at).toLocaleDateString()}</td>
                    <td>
                      {dispute.status === 'open' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleResolve(dispute)}
                        >
                          Resolve
                        </button>
                      )}
                      {dispute.status === 'resolved' && dispute.admin_response && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>Response:</strong> {dispute.admin_response}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDispute && (
        <Modal onClose={() => setSelectedDispute(null)}>
          <h2>Resolve Dispute</h2>
          <div style={{ marginBottom: '20px' }}>
            <h3>{selectedDispute.title}</h3>
            <p><strong>User:</strong> {selectedDispute.user_name}</p>
            <p><strong>Description:</strong> {selectedDispute.description}</p>
          </div>
          <form onSubmit={handleResolveSubmit}>
            <div className="form-group">
              <label>Admin Response</label>
              <textarea
                value={resolveForm.adminResponse}
                onChange={(e) => setResolveForm({ ...resolveForm, adminResponse: e.target.value })}
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={resolveForm.status}
                onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}
              >
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Submit Resolution</button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDispute(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default DisputesManagement;

