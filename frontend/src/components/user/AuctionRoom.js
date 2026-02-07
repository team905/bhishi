import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './AuctionRoom.css';

function AuctionRoom() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cycle, setCycle] = useState(null);
  const [bids, setBids] = useState([]);
  const [myBid, setMyBid] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const bidsEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchCycleData();
    
    // Set up polling for live updates every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchBids();
    }, 3000);

    // Set up countdown timer
    const timerInterval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(timerInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  useEffect(() => {
    if (bidsEndRef.current) {
      bidsEndRef.current.scrollTop = bidsEndRef.current.scrollHeight;
    }
  }, [bids]);

  const fetchCycleData = async () => {
    try {
      const response = await axios.get(`/api/bidding/cycles`);
      const cycleData = response.data.find(c => c.id === parseInt(cycleId));
      
      if (!cycleData) {
        setError('Bidding cycle not found');
        return;
      }

      setCycle(cycleData);
      setMyBid(cycleData.myBid);
      setBidAmount(cycleData.myBid?.bid_amount?.toString() || '');
      
      await fetchBids();
      updateCountdown();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cycle:', error);
      setError('Failed to load auction room');
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const response = await axios.get(`/api/bidding/cycles/${cycleId}/bids`);
      const sortedBids = response.data.sort((a, b) => {
        if (a.bid_amount !== b.bid_amount) {
          return a.bid_amount - b.bid_amount; // Sort by amount (lowest first)
        }
        return new Date(a.bid_time) - new Date(b.bid_time); // Then by time
      });
      setBids(sortedBids);
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const updateCountdown = () => {
    if (!cycle) return;

    const now = new Date();
    const endDate = new Date(cycle.bidding_end_date);
    const diff = endDate - now;

    if (diff <= 0) {
      setTimeRemaining({ ended: true });
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining({ hours, minutes, seconds, ended: false });
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    if (parseFloat(bidAmount) >= cycle.total_pool_amount) {
      setError(`Bid must be less than ₹${cycle.total_pool_amount}`);
      return;
    }

    // Check minimum bid if available
    if (cycle.min_bid_amount && parseFloat(bidAmount) < cycle.min_bid_amount) {
      setError(`Bid must be at least ₹${cycle.min_bid_amount.toFixed(2)} (Maximum ${cycle.max_bid_reduction_percentage || 40}% reduction allowed)`);
      return;
    }

    try {
      await axios.post('/api/bidding/bid', {
        cycleId: parseInt(cycleId),
        bidAmount: parseFloat(bidAmount)
      });

      setSuccess('Bid placed successfully!');
      setMyBid({ bid_amount: parseFloat(bidAmount), bid_time: new Date().toISOString() });
      
      // Refresh bids immediately
      await fetchBids();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to place bid';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const isBiddingOpen = () => {
    if (!cycle) return false;
    const now = new Date();
    const start = new Date(cycle.bidding_start_date);
    const end = new Date(cycle.bidding_end_date);
    return now >= start && now <= end;
  };

  const canBid = () => {
    return isBiddingOpen() && !cycle.hasWonBefore;
  };

  const getLowestBid = () => {
    if (bids.length === 0) return null;
    return bids[0];
  };

  // User bids the amount they want to receive (no calculation needed)

  if (loading) {
    return <div className="auction-room-loading">Loading auction room...</div>;
  }

  if (!cycle) {
    return (
      <div className="auction-room-error">
        <h2>Bidding Cycle Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const lowestBid = getLowestBid();
  const isOpen = isBiddingOpen();
  const canPlaceBid = canBid();

  return (
    <div className="auction-room">
      <div className="auction-room-header">
        <button className="btn btn-secondary back-btn" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div className="auction-title">
          <h1><span className="icon">🎯</span> {cycle.group_name} - Cycle #{cycle.cycle_number}</h1>
          <p className="auction-subtitle">Reverse Auction - Lowest Bid Wins</p>
        </div>
      </div>

      <div className="auction-room-content">
        {/* Left Panel - Auction Info & Bidding */}
        <div className="auction-left-panel">
          <div className="auction-info-card">
            <h2><span className="icon">ℹ️</span> Auction Details</h2>
            <div className="info-row">
              <span className="info-label">Bhishi Amount:</span>
              <span className="info-value">₹{cycle.total_pool_amount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Bids:</span>
              <span className="info-value">{bids.length}</span>
            </div>
            {lowestBid && (
              <div className="info-row highlight">
                <span className="info-label">Current Lowest Bid:</span>
                <span className="info-value">₹{lowestBid.bid_amount}</span>
              </div>
            )}
            {lowestBid && (
              <>
                <div className="info-row">
                  <span className="info-label">Winner Would Receive:</span>
                  <span className="info-value highlight-green">
                    ₹{lowestBid.bid_amount.toFixed(2)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Profit to Share:</span>
                  <span className="info-value highlight-green">
                    ₹{(cycle.total_pool_amount - lowestBid.bid_amount).toFixed(2)}
                  </span>
                </div>
              </>
            )}
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className={`info-value badge ${isOpen ? 'badge-success' : 'badge-danger'}`}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Countdown Timer */}
          {isOpen && timeRemaining && !timeRemaining.ended && (
            <div className="countdown-card">
              <h3><span className="icon">⏰</span> Time Remaining</h3>
              <div className="countdown-timer">
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">Hours</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">Minutes</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">Seconds</span>
                </div>
              </div>
            </div>
          )}

          {timeRemaining?.ended && (
            <div className="countdown-card ended">
              <h3>Bidding Has Ended</h3>
            </div>
          )}

          {/* Bidding Form */}
          {canPlaceBid && (
            <div className="bid-form-card">
              <h2><span className="icon">✍️</span> Place Your Bid</h2>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <form onSubmit={handlePlaceBid}>
                <div className="form-group">
                  <label>Your Bid Amount (₹)</label>
                  <div className="bid-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min={cycle.min_bid_amount || cycle.total_pool_amount * 0.6}
                      max={cycle.total_pool_amount - 0.01}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Enter amount you want to receive (min: ₹${cycle.min_bid_amount ? cycle.min_bid_amount.toFixed(2) : (cycle.total_pool_amount * 0.6).toFixed(2)})`}
                      required
                      className="bid-input"
                    />
                    {cycle.max_bid_reduction_percentage && (
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                        Maximum reduction: {cycle.max_bid_reduction_percentage}%. Minimum bid: ₹{(cycle.total_pool_amount * (1 - cycle.max_bid_reduction_percentage / 100)).toFixed(2)}
                      </small>
                    )}
                  </div>
                  <div className="bid-help-text">
                    <strong>You bid the amount you want to receive: ₹{bidAmount && parseFloat(bidAmount) > 0 ? parseFloat(bidAmount).toFixed(2) : '0.00'}</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Profit to share: ₹{bidAmount && parseFloat(bidAmount) > 0 ? (cycle.total_pool_amount - parseFloat(bidAmount)).toFixed(2) : cycle.total_pool_amount.toFixed(2)}
                      <br />
                      Lower bid = More profit = Less you pay next month
                    </div>
                  </div>
                </div>

                {myBid && (
                  <div className="current-bid-info">
                    <p>Your current bid: <strong>₹{myBid.bid_amount}</strong></p>
                    <p className="small-text">You can update your bid before the deadline</p>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-large">
                  {myBid ? 'Update Bid' : 'Place Bid'}
                </button>
              </form>
            </div>
          )}

          {cycle.hasWonBefore && (
            <div className="info-card warning">
              <h3>Already Won</h3>
              <p>You have already won in a previous cycle. You cannot bid again.</p>
            </div>
          )}

          {!isOpen && !timeRemaining?.ended && (
            <div className="info-card">
              <h3>Bidding Not Started</h3>
              <p>Bidding will start on {new Date(cycle.bidding_start_date).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Right Panel - Bid History */}
        <div className="auction-right-panel">
          <div className="bids-history-card">
            <h2><span className="icon">📊</span> Live Bidding Activity</h2>
            <div className="bids-list" ref={bidsEndRef}>
              {bids.length === 0 ? (
                <div className="no-bids">
                  <p>No bids placed yet</p>
                  <p className="small-text">Be the first to place a bid!</p>
                </div>
              ) : (
                bids.map((bid, index) => {
                  const isLowest = index === 0;
                  const isMyBid = user && bid.user_id === user.id;
                  return (
                    <div
                      key={bid.id}
                      className={`bid-item ${isLowest ? 'lowest-bid' : ''} ${isMyBid ? 'my-bid' : ''}`}
                    >
                      <div className="bid-header">
                        <div className="bid-user">
                          <strong>{bid.full_name}</strong>
                          {isMyBid && <span className="badge badge-info">You</span>}
                          {isLowest && <span className="badge badge-success">Lowest</span>}
                        </div>
                        <div className="bid-time">
                          {new Date(bid.bid_time).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="bid-amount">
                        <span className="bid-label">Bid:</span>
                        <span className="bid-value">₹{bid.bid_amount}</span>
                      </div>
                      <div className="bid-payout">
                        <span className="bid-label">Would Receive:</span>
                        <span className="bid-value highlight">₹{bid.bid_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionRoom;

