import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (tokens exist in localStorage)
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (accessToken && refreshToken) {
        setIsAuthenticated(true);
        // You can also fetch user profile here if needed
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Add signup function
  const signup = async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      // First register the user
      const signupResponse = await fetch('https://color-prediction-742i.onrender.com/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok) {
        throw new Error(signupData.message || 'Registration failed');
      }

      // If registration successful, automatically log them in
      return await login(username, password);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const login = async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('https://color-prediction-742i.onrender.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_type', data.token_type);
      
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Implement refresh token logic here when endpoint is available
      // const response = await fetch('https://color-prediction-742i.onrender.com/auth/refresh', {...});
      
      return true;
    } catch (err) {
      logout();
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
      refreshToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);