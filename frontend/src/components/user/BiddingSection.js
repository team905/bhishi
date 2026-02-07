import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import Modal from '../Modal';

function BiddingSection({ cycles, myBids, onBidPlaced }) {
  const navigate = useNavigate();
  const [biddingCycles, setBiddingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const response = await axios.get(getApiUrl('/bidding/cycles'));
      setBiddingCycles(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bidding cycles' });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = (cycle) => {
    // Check if user has already won in a previous cycle
    if (cycle.hasWonBefore) {
      setMessage({ type: 'error', text: 'You have already won in a previous cycle. You cannot bid again.' });
      return;
    }
    
    setSelectedCycle(cycle);
    setBidAmount(cycle.myBid?.bid_amount?.toString() || '');
    setShowBidModal(true);
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await axios.post(getApiUrl('/bidding/bid'), {
        cycleId: selectedCycle.id,
        bidAmount: parseFloat(bidAmount)
      });

      setMessage({ type: 'success', text: 'Bid placed successfully' });
      setShowBidModal(false);
      fetchCycles();
      if (onBidPlaced) onBidPlaced();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to place bid' });
    }
  };

  const handleViewBids = async (cycle) => {
    setSelectedCycle(cycle);
    try {
      const response = await axios.get(getApiUrl(`/bidding/cycles/${cycle.id}/bids`));
      setSelectedCycle({ ...cycle, bids: response.data });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bids' });
    }
  };

  const isBiddingOpen = (cycle) => {
    const now = new Date();
    const start = new Date(cycle.bidding_start_date);
    const end = new Date(cycle.bidding_end_date);
    return now >= start && now <= end;
  };

  if (loading) return <div className="loading">Loading bidding cycles...</div>;

  return (
    <div>
      {message.text && (
        <div className={message.type === 'error' ? 'error' : 'success'}>
          {message.text}
        </div>
      )}

      {biddingCycles.length === 0 ? (
        <div className="empty-state">
          <h3>No active bidding cycles</h3>
          <p>There are currently no bidding cycles available for your groups.</p>
        </div>
      ) : (
        <div className="card">
          <h2><span className="icon">🎯</span> Active Bidding Cycles</h2>
          <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Cycle #</th>
                <th>Pool Amount</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>My Bid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {biddingCycles.map(cycle => {
                const isOpen = isBiddingOpen(cycle);
                return (
                  <tr key={cycle.id}>
                    <td><strong>{cycle.group_name}</strong></td>
                    <td>{cycle.cycle_number}</td>
                    <td>₹{cycle.total_pool_amount}</td>
                    <td>{new Date(cycle.bidding_start_date).toLocaleString()}</td>
                    <td>{new Date(cycle.bidding_end_date).toLocaleString()}</td>
                    <td>
                      {cycle.myBid ? (
                        <div>
                          <strong>₹{cycle.myBid.bid_amount}</strong>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(cycle.myBid.bid_time).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>No bid</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isOpen ? 'badge-success' : 'badge-warning'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        {isOpen && !cycle.hasWonBefore && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => navigate(`/auction/${cycle.id}`)}
                            >
                              Enter Auction Room
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => handlePlaceBid(cycle)}
                            >
                              Quick Bid
                            </button>
                          </>
                        )}
                        {cycle.hasWonBefore && (
                          <span className="badge badge-warning">
                            Already Won
                          </span>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleViewBids(cycle)}
                        >
                          View Bids
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showBidModal && selectedCycle && (
        <Modal onClose={() => setShowBidModal(false)}>
          <h2>Place Bid - {selectedCycle.group_name} Cycle #{selectedCycle.cycle_number}</h2>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Bhishi Amount:</strong> ₹{selectedCycle.total_pool_amount}</p>
            <p><strong>Bidding Ends:</strong> {new Date(selectedCycle.bidding_end_date).toLocaleString()}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              <strong>Reverse Auction:</strong> Bid an amount LESS than ₹{selectedCycle.total_pool_amount}. The lowest bid wins.
            </p>
          </div>
          <form onSubmit={handleBidSubmit}>
            <div className="form-group">
              <label>Bid Amount (₹) - Must be less than ₹{selectedCycle.total_pool_amount}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={selectedCycle.total_pool_amount - 0.01}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                required
                placeholder={`Enter amount less than ₹${selectedCycle.total_pool_amount}`}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                <strong>You bid the amount you want to receive: ₹{bidAmount && parseFloat(bidAmount) > 0 ? parseFloat(bidAmount).toFixed(2) : '0.00'}</strong>
                {bidAmount && parseFloat(bidAmount) > 0 && (
                  <div style={{ marginTop: '5px' }}>
                    Profit to share: ₹{(selectedCycle.total_pool_amount - parseFloat(bidAmount)).toFixed(2)}
                    <br />
                    Lower bid = More profit = Less you pay next month
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">
                {selectedCycle.myBid ? 'Update Bid' : 'Place Bid'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBidModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedCycle && selectedCycle.bids && (
        <Modal onClose={() => setSelectedCycle(null)}>
          <h2>All Bids - Cycle #{selectedCycle.cycle_number}</h2>
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
                  {selectedCycle.bids
                    .sort((a, b) => a.bid_amount - b.bid_amount)
                    .map((bid, index) => (
                      <tr key={bid.id} style={{ backgroundColor: index === 0 ? '#e8f5e9' : 'transparent' }}>
                        <td>
                          {bid.full_name} {index === 0 && <span className="badge badge-success">Lowest</span>}
                        </td>
                        <td><strong>₹{bid.bid_amount}</strong></td>
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

export default BiddingSection;

