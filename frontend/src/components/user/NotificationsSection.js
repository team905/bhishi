import React, { useState, useEffect } from 'react';
import axios from 'axios';

function NotificationsSection() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread'); // 'all', 'unread' - default to unread

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      const url = filter === 'unread' 
        ? '/api/users/notifications?unreadOnly=true'
        : '/api/users/notifications';
      const response = await axios.get(url);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/users/notifications/${notificationId}/read`);
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: 1 } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          axios.put(`/api/users/notifications/${n.id}/read`)
        )
      );
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bidding_cycle':
        return '🎯';
      case 'winner':
        return '🎉';
      case 'payment_due':
        return '💰';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'bidding_cycle':
        return '#2196F3';
      case 'winner':
        return '#4CAF50';
      case 'payment_due':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  if (loading) return <div className="loading">Loading notifications...</div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2>
            <span className="icon">🔔</span> Notifications
            {unreadCount > 0 && (
              <span className="badge badge-warning" style={{ marginLeft: '10px', fontSize: '14px' }}>
                {unreadCount} unread
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('all')}
              style={{ padding: '5px 15px', fontSize: '14px' }}
            >
              All
            </button>
            <button
              className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('unread')}
              style={{ padding: '5px 15px', fontSize: '14px' }}
            >
              Unread
            </button>
            {unreadCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={markAllAsRead}
                style={{ padding: '5px 15px', fontSize: '14px' }}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <h3>No notifications</h3>
            <p>You don't have any notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  padding: '15px',
                  border: `2px solid ${getNotificationColor(notification.type)}`,
                  borderRadius: '8px',
                  backgroundColor: notification.is_read ? '#f9f9f9' : '#fff',
                  borderLeft: `5px solid ${getNotificationColor(notification.type)}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: notification.is_read ? 0.8 : 1
                }}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{getNotificationIcon(notification.type)}</span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: getNotificationColor(notification.type) }}>
                        {notification.title || 'Notification'}
                      </h3>
                      {!notification.is_read && (
                        <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          New
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                      {notification.message}
                    </p>
                    {notification.group_name && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                        Group: {notification.group_name}
                        {notification.cycle_number && ` • Cycle #${notification.cycle_number}`}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsSection;

