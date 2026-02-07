import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const AuthContext = createContext();

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(getApiUrl('/auth/me'));
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(getApiUrl('/auth/login'), { username, password });
      const { token, user, requiresPasswordChange } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return { success: true, user, requiresPasswordChange: requiresPasswordChange || false };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Login failed'
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post(getApiUrl('/auth/change-password'), {
        currentPassword,
        newPassword
      });
      // Update user state to reflect password change
      const updatedUser = { ...user, passwordChanged: true };
      setUser(updatedUser);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Change password error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to change password'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    fetchUser,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

