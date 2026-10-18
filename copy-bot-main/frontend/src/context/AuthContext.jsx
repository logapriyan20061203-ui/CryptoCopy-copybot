import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);
let initialSessionRefresh = null;

const refreshSession = () => {
  if (!initialSessionRefresh) {
    initialSessionRefresh = api.post('/auth/refresh').finally(() => {
      initialSessionRefresh = null;
    });
  }
  return initialSessionRefresh;
};

const getAuthErrorMessage = (err, fallback) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return 'The request timed out. Please try again.';
  }
  if (!err.response) return 'Unable to reach the server. Check your connection and try again.';
  return err.message || fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize session by attempting token refresh on page load
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        const response = await refreshSession();
        if (!mounted) return;
        if (response.data?.success) {
          const { user: userData, accessToken } = response.data.data;
          setAccessToken(accessToken);
          setUser(userData);
        }
      } catch (err) {
        // Not logged in or expired refresh token; expected for guest visitors
        if (mounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const handleUnauthorized = () => {
      setAccessToken(null);
      setUser(null);
    };

    initAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      }
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success) {
        const { user: userData, accessToken } = response.data.data;
        setAccessToken(accessToken);
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Login failed');
      const details = err.response?.data?.error?.details || [];
      setError(message);
      return { success: false, message, details };
    }
  };

  const register = async ({ email, password, displayName }) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password, displayName });
      if (response.data?.success) {
        const { user: userData, accessToken } = response.data.data;
        setAccessToken(accessToken);
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Registration failed');
      const details = err.response?.data?.error?.details || [];
      setError(message);
      return { success: false, message, details };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
