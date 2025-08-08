import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/auth/status', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          // Also fetch detailed user info from the API
          try {
            const userResponse = await fetch('/api/user', {
              credentials: 'include'
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUser(userData);
            } else {
              setUser(data.user);
            }
          } catch (userErr) {
            console.error('Error fetching user details:', userErr);
            setUser(data.user);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setUser(null);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Store the current location so we can redirect back after login
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth/login?returnTo=${returnTo}`;
  };

  const logout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setUser(null);
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    login,
    logout,
    checkAuthStatus,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 