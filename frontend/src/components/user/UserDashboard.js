import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Navbar from '../Navbar';
import BiddingSection from './BiddingSection';
import GroupsSection from './GroupsSection';
import ContributionsSection from './ContributionsSection';
import FinancialSummary from './FinancialSummary';
import NotificationsSection from './NotificationsSection';
import './UserDashboard.css';
import './FinancialSummary.css';

function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for notification click from navbar
    const handleShowNotifications = () => {
      setActiveTab('notifications');
    };
    
    // Listen for dashboard refresh events (triggered by bid placements, payments, etc.)
    const handleDashboardRefresh = () => {
      fetchDashboardData();
    };
    
    // Listen for window focus (user returns to tab) - refresh once
    const handleWindowFocus = () => {
      fetchDashboardData();
    };
    
    window.addEventListener('showNotifications', handleShowNotifications);
    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('showNotifications', handleShowNotifications);
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await axios.get('/api/users/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('=== DASHBOARD API RESPONSE ===');
      console.log('Full response:', response.data);
      console.log('Financial Summary:', response.data?.financialSummary);
      console.log('Contributions:', response.data?.contributions);
      console.log('Profit Distributions:', response.data?.profitDistributions);
      console.log('Winnings:', response.data?.winnings);
      console.log('================================');
      
      if (response.data && response.data.financialSummary) {
        setDashboardData(response.data);
      } else {
        console.error('Invalid response format - missing financialSummary');
        setDashboardData(null);
      }
    } catch (error) {
      console.error('=== DASHBOARD API ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('===========================');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!dashboardData) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
            <p>Failed to load dashboard data. Please refresh the page.</p>
            <button onClick={fetchDashboardData} className="btn btn-primary" style={{ marginTop: '10px' }}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total amount due (sum of payable_amount for pending contributions)
  const pendingContributions = dashboardData?.contributions?.filter(c => c.payment_status === 'pending') || [];
  const totalAmountDue = pendingContributions.reduce((sum, c) => {
    const payableAmount = c.payable_amount !== null && c.payable_amount !== undefined 
      ? c.payable_amount 
      : c.amount;
    return sum + parseFloat(payableAmount || 0);
  }, 0);

  // Ensure we have valid numbers, not NaN or undefined
  const financialSummary = dashboardData?.financialSummary || {};
  const totalContributions = parseFloat(financialSummary.totalContributions || 0) || 0;
  const totalEarnings = parseFloat(financialSummary.totalEarnings || 0) || 0;
  const totalWinnings = parseFloat(financialSummary.totalWinnings || 0) || 0;
  const netAmount = parseFloat(financialSummary.netAmount || 0) || 0;
  const hasWon = financialSummary.hasWon || false;
  const calculatedTotalAmountDue = parseFloat(totalAmountDue || 0) || 0;

  const stats = {
    totalGroups: dashboardData?.groups?.length || 0,
    activeCycles: dashboardData?.activeCycles?.length || 0,
    totalContributions: dashboardData?.contributions?.length || 0,
    pendingContributions: pendingContributions.length,
    totalContributed: totalContributions,
    totalEarned: totalEarnings,
    totalWinnings: totalWinnings,
    netAmount: netAmount,
    hasWon: hasWon,
    totalAmountDue: calculatedTotalAmountDue
  };
  
  console.log('Dashboard Data:', dashboardData);
  console.log('Financial Summary:', financialSummary);
  console.log('Calculated stats:', stats);

  return (
    <div>
      <Navbar />
      <div className="dashboard-header">
        <div className="container">
          <h1>Welcome, {user?.fullName || user?.username}!</h1>
          <p>Your Bhishi Dashboard</p>
        </div>
      </div>
      <div className="container">
        <div className="stats-grid">
          <div className="stats-card">
            <h3><span className="icon">👥</span> My Groups</h3>
            <div className="value">{stats.totalGroups}</div>
          </div>
          <div className="stats-card">
            <h3><span className="icon">🎯</span> Active Bidding</h3>
            <div className="value">{stats.activeCycles}</div>
          </div>
          <div className="stats-card highlight-card">
            <h3><span className="icon">💸</span> Total Contributed</h3>
            <div className="value">₹{stats.totalContributed.toFixed(2)}</div>
          </div>
          <div className="stats-card highlight-card">
            <h3><span className="icon">💰</span> Total Earned (Profit)</h3>
            <div className="value" style={{ color: '#28a745' }}>₹{stats.totalEarned.toFixed(2)}</div>
          </div>
          <div className="stats-card highlight-card">
            <h3><span className="icon">🏆</span> Total Winnings</h3>
            <div className="value" style={{ color: '#28a745' }}>₹{stats.totalWinnings.toFixed(2)}</div>
          </div>
          <div className="stats-card highlight-card">
            <h3><span className="icon">📊</span> Net Amount</h3>
            <div className="value" style={{ color: stats.netAmount >= 0 ? '#28a745' : '#dc3545' }}>
              ₹{stats.netAmount.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontWeight: '500' }}>
              {stats.netAmount >= 0 ? '✓ Profit' : '⚠ Loss'}
            </div>
          </div>
          <div className="stats-card highlight-card" style={{ border: '2px solid #ff9800', backgroundColor: '#fff9e6' }}>
            <h3><span className="icon">💵</span> Total Amount Due</h3>
            <div className="value" style={{ color: '#ff9800', fontSize: '28px', fontWeight: '700' }}>
              ₹{stats.totalAmountDue.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontWeight: '500' }}>
              {stats.pendingContributions > 0 ? `${stats.pendingContributions} pending payment(s)` : 'All paid ✓'}
            </div>
          </div>
          <div className="stats-card">
            <h3><span className="icon">🎲</span> Win Status</h3>
            <div className="value" style={{ fontSize: '24px' }}>
              {stats.hasWon ? (
                <span className="badge badge-success">✓ Won Before</span>
              ) : (
                <span className="badge badge-warning">Not Won Yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="user-tabs">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              // Refresh data when switching to dashboard tab
              fetchDashboardData(true); // Silent refresh
            }}
          >
            <span className="icon">🎯</span> Active Bidding
          </button>
          <button
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('groups');
              // Refresh data when switching tabs
              fetchDashboardData(true); // Silent refresh
            }}
          >
            <span className="icon">👥</span> My Groups
          </button>
          <button
            className={`tab-btn ${activeTab === 'contributions' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('contributions');
              // Refresh data when switching tabs
              fetchDashboardData(true); // Silent refresh
            }}
          >
            <span className="icon">💳</span> Contributions
          </button>
          <button
            className={`tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('financial');
              // Refresh data when switching tabs
              fetchDashboardData(true); // Silent refresh
            }}
          >
            <span className="icon">📊</span> Financial Summary
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'dashboard' && (
            <BiddingSection
              cycles={dashboardData?.activeCycles || []}
              myBids={dashboardData?.myBids || []}
              onBidPlaced={fetchDashboardData}
            />
          )}
          {activeTab === 'groups' && (
            <GroupsSection groups={dashboardData?.groups || []} />
          )}
          {activeTab === 'contributions' && (
            <ContributionsSection 
              contributions={dashboardData?.contributions || []}
              onVerificationClick={(cycleId) => {
                navigate(`/verification/${cycleId}`);
              }}
            />
          )}
          {activeTab === 'financial' && (
            <FinancialSummary
              financialSummary={dashboardData?.financialSummary}
              winnings={dashboardData?.winnings}
              profitDistributions={dashboardData?.profitDistributions}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationsSection />
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;

