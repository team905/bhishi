import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './WinnerVerification.css';

function WinnerVerification() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cycle, setCycle] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signature, setSignature] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState('agreement');

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  const fetchData = async () => {
    try {
      const [agreementRes, verificationRes] = await Promise.all([
        axios.get(`/api/agreements/cycles/${cycleId}`),
        axios.get(`/api/verification/cycles/${cycleId}`)
      ]);

      setCycle(agreementRes.data.cycle);
      setAgreement(agreementRes.data.agreement);
      setVerification(verificationRes.data.verification);

      if (agreementRes.data.agreement) {
        setActiveTab('verification');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!signature.trim()) {
      setError('Please provide your signature');
      return;
    }

    try {
      await axios.post('/api/agreements/sign', {
        cycleId: parseInt(cycleId),
        signatureData: signature
      });

      setSuccess('Agreement signed successfully!');
      setTimeout(() => {
        setActiveTab('verification');
        fetchData();
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to sign agreement');
    }
  };

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!videoUrl.trim()) {
      setError('Please provide video URL');
      return;
    }

    try {
      await axios.post('/api/verification/upload', {
        cycleId: parseInt(cycleId),
        videoUrl: videoUrl.trim()
      });

      setSuccess('Video verification uploaded successfully! Waiting for admin approval.');
      setVideoUrl('');
      fetchData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload video');
    }
  };

  if (loading) {
    return <div className="verification-loading">Loading...</div>;
  }

  if (!cycle) {
    return (
      <div className="verification-error">
        <h2>Cycle Not Found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="winner-verification">
      <div className="verification-header">
        <button className="btn btn-secondary back-btn" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div>
          <h1><span className="icon">🏆</span> Winner Verification</h1>
          <p>{cycle.groupName} - Cycle #{cycle.cycleNumber}</p>
        </div>
      </div>

      <div className="verification-content">
        <div className="winner-info-card">
          <h2><span className="icon">🎉</span> Congratulations! You Won!</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Total Pool Amount:</span>
              <span className="value">₹{cycle.totalPoolAmount}</span>
            </div>
            <div className="info-item">
              <span className="label">Your Winning Bid:</span>
              <span className="value">₹{cycle.winningBidAmount}</span>
            </div>
            <div className="info-item highlight">
              <span className="label">You Will Receive:</span>
              <span className="value">₹{cycle.payoutAmount}</span>
            </div>
            <div className="info-item">
              <span className="label">Profit to Distribute:</span>
              <span className="value">₹{cycle.winningBidAmount}</span>
            </div>
          </div>
          <div className="warning-box">
            <strong>Important:</strong> You must complete both steps below before the payout can be released.
          </div>
        </div>

        <div className="verification-tabs">
          <button
            className={`tab-btn ${activeTab === 'agreement' ? 'active' : ''}`}
            onClick={() => setActiveTab('agreement')}
            disabled={!!agreement}
          >
            {agreement ? '✓ Agreement Signed' : '1. Sign Agreement'}
          </button>
          <button
            className={`tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
            disabled={!agreement}
          >
            {verification?.verification_status === 'approved' 
              ? '✓ Video Verified' 
              : verification?.verification_status === 'pending'
              ? '⏳ Video Pending Approval'
              : '2. Video Verification'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {activeTab === 'agreement' && (
          <div className="verification-card">
            <h2><span className="icon">📝</span> Step 1: Sign Agreement</h2>
            {agreement ? (
              <div className="completed-step">
                <div className="checkmark">✓</div>
                <h3>Agreement Signed</h3>
                <p>You signed the agreement on {new Date(agreement.signed_at).toLocaleString()}</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('verification')}>
                  Continue to Video Verification →
                </button>
              </div>
            ) : (
              <>
                <div className="agreement-text">
                  <pre>{cycle.agreementText}</pre>
                </div>
                <form onSubmit={handleSignAgreement}>
                  <div className="form-group">
                    <label>Type your full name to sign:</label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-large">
                    Sign Agreement
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="verification-card">
            <h2><span className="icon">🎥</span> Step 2: Video Verification</h2>
            {!agreement && (
              <div className="warning-box">
                Please sign the agreement first before proceeding to video verification.
              </div>
            )}
            
            {verification?.verification_status === 'approved' ? (
              <div className="completed-step">
                <div className="checkmark">✓</div>
                <h3>Video Verification Approved</h3>
                <p>Your video was verified on {new Date(verification.verified_at).toLocaleString()}</p>
                <div className="status-badge approved">Approved</div>
              </div>
            ) : verification?.verification_status === 'pending' ? (
              <div className="pending-step">
                <div className="pending-icon">⏳</div>
                <h3>Video Verification Pending</h3>
                <p>Your video has been uploaded and is waiting for admin approval.</p>
                {verification.video_url && (
                  <div className="video-link">
                    <a href={verification.video_url} target="_blank" rel="noopener noreferrer">
                      View Uploaded Video
                    </a>
                  </div>
                )}
                <div className="status-badge pending">Pending Approval</div>
              </div>
            ) : (
              <>
                <div className="instructions">
                  <h3>Instructions:</h3>
                  <ol>
                    <li>Record a short video (1-2 minutes) introducing yourself</li>
                    <li>State your name, the group name, and cycle number</li>
                    <li>Confirm that you understand the terms and conditions</li>
                    <li>Upload the video to a hosting service (YouTube, Google Drive, etc.)</li>
                    <li>Paste the video URL below</li>
                  </ol>
                </div>
                <form onSubmit={handleUploadVideo}>
                  <div className="form-group">
                    <label>Video URL:</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                      required
                      disabled={!agreement}
                    />
                    <small>Upload your video to YouTube, Google Drive, or similar service and paste the link here</small>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-large"
                    disabled={!agreement}
                  >
                    Upload Video Verification
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {agreement && verification?.verification_status === 'approved' && (
          <div className="completion-card">
            <h2>✓ Verification Complete!</h2>
            <p>Both agreement signing and video verification are complete. The admin will now approve your payout.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WinnerVerification;

