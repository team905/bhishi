import React, { useState } from 'react';
import Navbar from '../Navbar';
import UsersManagement from './UsersManagement';
import GroupsManagement from './GroupsManagement';
import BiddingManagement from './BiddingManagement';
import DisputesManagement from './DisputesManagement';
import VideoVerifications from './VideoVerifications';
import './AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div>
      <Navbar />
      <div className="dashboard-header">
        <div className="container">
          <h1>Admin Dashboard</h1>
          <p>Manage users, groups, bidding cycles, and disputes</p>
        </div>
      </div>
      <div className="container">
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Groups
          </button>
          <button
            className={`tab-btn ${activeTab === 'bidding' ? 'active' : ''}`}
            onClick={() => setActiveTab('bidding')}
          >
            Bidding Cycles
          </button>
          <button
            className={`tab-btn ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            Disputes
          </button>
          <button
            className={`tab-btn ${activeTab === 'verifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('verifications')}
          >
            Video Verifications
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'groups' && <GroupsManagement />}
          {activeTab === 'bidding' && <BiddingManagement />}
          {activeTab === 'disputes' && <DisputesManagement />}
          {activeTab === 'verifications' && <VideoVerifications />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

