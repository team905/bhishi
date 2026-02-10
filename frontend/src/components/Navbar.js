import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchUnreadCount();
      
      // Listen for notification updates (triggered when notifications change)
      const handleNotificationUpdate = () => {
        fetchUnreadCount();
      };
      
      window.addEventListener('notificationUpdate', handleNotificationUpdate);
      
      // Poll for new notifications every 60 seconds (reduced frequency)
      const interval = setInterval(fetchUnreadCount, 60000);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/users/notifications?unreadOnly=true');
      setUnreadCount(response.data.length);
    } catch (error) {
      // Silently fail - user might not be logged in
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '20px' }}>
            <span style={{ fontSize: '24px' }}>💰</span> Bhishi Management
          </Link>
        </div>
        <div className="navbar-links">
          {user?.role === 'admin' && (
            <>
              <Link to="/admin">Admin Dashboard</Link>
            </>
          )}
          <div className="navbar-user">
            {user?.role === 'user' && (
              <Link 
                to="/dashboard" 
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/dashboard');
                  // Trigger tab change to notifications - we'll handle this via state
                  const event = new CustomEvent('showNotifications');
                  window.dispatchEvent(event);
                }}
                style={{ 
                  marginRight: '15px', 
                  color: 'white', 
                  textDecoration: 'none',
                  position: 'relative',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  backgroundColor: unreadCount > 0 ? 'rgba(255, 193, 7, 0.2)' : 'transparent'
                }}
              >
                <span style={{ fontSize: '20px' }}>🔔</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <span>Welcome, {user?.fullName || user?.username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

