import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DevUserSwitcher = ({ onUserSwitch }) => {
  const { user: loggedInUser } = useAuth(); // Get the actual logged-in user
  const [isVisible, setIsVisible] = useState(false);

  const testUsers = [
    { sunet_id: 'test_user_1', display_name: 'Test User One', email: 'test1@stanford.edu' },
    { sunet_id: 'test_user_2', display_name: 'Test User Two', email: 'test2@stanford.edu' },
    { sunet_id: 'test_user_3', display_name: 'Test User Three', email: 'test3@stanford.edu' }
  ];

  const switchToUser = async (user) => {
    try {
      const response = await fetch('/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          name: user.display_name
        })
      });

      if (response.ok) {
        setIsVisible(false);
        if (onUserSwitch) {
          onUserSwitch(user);
        }
        // Reload the page to update the auth context
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to switch user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error switching user:', error);
      alert('Failed to switch user. Make sure you\'re in development mode.');
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/auth/dev-logout', {
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsVisible(false);
        // Reload the page to update the auth context
        window.location.reload();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      fontSize: '12px'
    }}>
      <div style={{ marginBottom: '8px' }}>
        <strong>Dev User Switcher</strong>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          style={{
            marginLeft: '8px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {isVisible && (
        <div>
          <div style={{ marginBottom: '8px', fontSize: '11px' }}>
            <strong>Current:</strong> {loggedInUser ? loggedInUser.displayName : 'None'}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Switch to:</strong>
            {testUsers.map((user) => (
              <button
                key={user.sunet_id}
                onClick={() => switchToUser(user)}
                style={{
                  display: 'block',
                  width: '100%',
                  margin: '2px 0',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  backgroundColor: loggedInUser?.sunetId === user.sunet_id ? '#e0e0e0' : '#fff'
                }}
              >
                {user.display_name}
              </button>
            ))}
          </div>
          
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '10px',
              cursor: 'pointer',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              color: '#d32f2f'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default DevUserSwitcher; 