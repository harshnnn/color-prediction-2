import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/apiClient'; // Import the apiClient

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    const handleAuthFailure = () => {
      logout();
    };

    window.addEventListener('auth-failure', handleAuthFailure);

    // Initial auth check
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    if (accessToken && refreshToken) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);

    return () => {
      window.removeEventListener('auth-failure', handleAuthFailure);
    };
  }, []);

  const login = async (username, password) => {
    setError(null);
    try {
      // Use apiClient for the login request
      const response = await apiClient('/auth/token', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_type', data.token_type);
      
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      return false;
    }
  };

  const signup = async (username, password, phone) => {
    setError(null);
    try {
      // Use apiClient for the signup request
      const signupResponse = await apiClient('/users/', {
        method: 'POST',
        body: JSON.stringify({ username, password, phone }),
      });

      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok) {
        throw new Error(signupData.detail || 'Registration failed');
      }

      // If registration is successful, automatically log them in
      return await login(username, password);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      error, 
      login,
      signup, 
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);