import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const api = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    // Check if user is already logged in (tokens exist in localStorage)
    const checkAuth = () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken && refreshToken) {
          // Only set authenticated if both tokens exist
          setIsAuthenticated(true);
        } else {
          // Clear any partial tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_type');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []); // Empty dependency array - only run once

  // Add signup function
  const signup = async (username, password, phone) => {
    setError(null);
    try {
      // First register the user
      const signupResponse = await fetch(`${api}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, phone }),
      });

      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok) {
        // Compose a detailed error message using backend error
        let backendMsg = signupData.message || signupData.detail || '';
        let errorMsg = 'Registration failed';
        if (backendMsg) {
          // Custom handling for unique constraint error
          if (backendMsg.includes('UNIQUE constraint failed: user.username')) {
            errorMsg += ': username already exists';
          } else {
            errorMsg += `: ${backendMsg}`;
          }
        }
        throw new Error(errorMsg);
      }

      // If registration successful, automatically log them in
      return await login(username, password);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      return false;
    }
  };

  const login = async (username, password) => {
    setError(null);
    try {
      const response = await fetch(`${api}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Compose a detailed error message using backend error
        let backendMsg = data.message || data.detail || '';
        let errorMsg = 'Login failed';
        if (backendMsg) {
          errorMsg += `: ${backendMsg}`;
        }
        throw new Error(errorMsg);
      }

      // Store tokens
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
      // const response = await fetch(`${api}/auth/refresh`, {...});
      
      return true;
    } catch (err) {
      logout();
      return false;
    }
  };

  const getValidAccessToken = async () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken;
    }

    if (refreshToken) {
      try {
        const response = await fetch(`${api}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          return data.access_token;
        }
      } catch (err) {
        console.error('Failed to refresh token:', err);
      }
    }

    logout();
    return null;
  };

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
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
      refreshToken,
      getValidAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);