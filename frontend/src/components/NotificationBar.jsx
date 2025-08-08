import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotificationBar.css';

const NotificationBar = () => {
  const [ownerRequests, setOwnerRequests] = useState(0);
  const [userUpdates, setUserUpdates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch high-priority updates for the user (approved/rejected/removed)
        const updatesRes = await fetch('/api/notifications/my-updates', { credentials: 'include' });
        const updatesData = updatesRes.ok ? await updatesRes.json() : [];
        
        // If there are new high-priority updates, we must show the bar.
        // This logic breaks through a previously dismissed low-priority notification.
        if (updatesData.length > 0) {
          sessionStorage.removeItem('notificationBarClosed');
        }
        setUserUpdates(updatesData);

        // Fetch low-priority pending requests for carpools the user owns
        const ownerRes = await fetch('/api/notifications/pending-requests', { credentials: 'include' });
        const ownerData = ownerRes.ok ? await ownerRes.json() : { pendingRequests: 0 };
        setOwnerRequests(ownerData.pendingRequests || 0);

      } catch (error) {
        console.error('Failed to fetch notification data:', error);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleClose = async () => {
    // If there were high-priority status updates, mark them as viewed on the backend.
    if (userUpdates.length > 0) {
      // Optimistically clear the updates from the UI to hide the bar instantly.
      setUserUpdates([]); 
      try {
        await fetch('/api/notifications/mark-updates-viewed', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Failed to mark notifications as viewed:', error);
      }
    }
    
    // For any notification, set the session flag to hide it until a new high-priority update arrives.
    sessionStorage.setItem('notificationBarClosed', 'true');
  };

  const barClosed = sessionStorage.getItem('notificationBarClosed') === 'true';
  const hasOwnerRequests = ownerRequests > 0;
  const hasUserUpdates = userUpdates.length > 0;

  if (!hasUserUpdates && (!hasOwnerRequests || barClosed)) {
    return null;
  }
  
  // High-priority user status updates (approved/rejected/removed) are shown first.
  if (hasUserUpdates) {
    const firstUpdate = userUpdates[0];
    
    let message, type;
    switch (firstUpdate.status) {
      case 'approved':
        message = `You have been accepted to "${firstUpdate.carpool_title}"!`;
        type = 'success';
        break;
      case 'rejected':
        message = `Your request for "${firstUpdate.carpool_title}" was rejected.`;
        type = 'error';
        break;
      case 'removed':
        message = `You were removed from the carpool "${firstUpdate.carpool_title}".`;
        type = 'removed';
        break;
      default:
        return null;
    }

    return (
      <div className={`notification-bar ${type}`}>
        <div className="notification-content">
          <span className="notification-icon">{
            type === 'success' ? '✅' : 
            type === 'error' ? '❌' : 
            'ℹ️'
          }</span>
          {message}
          {userUpdates.length > 1 && ` (and ${userUpdates.length - 1} other updates)`}
          <Link to="/my-trips" className="notification-link">View My Trips</Link>
        </div>
        <button onClick={handleClose} className="notification-close-btn">&times;</button>
      </div>
    );
  }
  
  // Low-priority owner pending requests are shown if there are no user updates.
  if (hasOwnerRequests && !barClosed) {
    return (
      <div className="notification-bar info">
        <div className="notification-content">
          <span className="notification-icon">🔔</span>
          You have {ownerRequests} new join request{ownerRequests > 1 ? 's' : ''} for your carpool{ownerRequests > 1 ? 's' : ''}.
          <Link to="/my-trips" className="notification-link">View Requests</Link>
        </div>
        <button onClick={handleClose} className="notification-close-btn">&times;</button>
      </div>
    );
  }

  return null;
};

export default NotificationBar; 