import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const { login, signup, error } = useAuth();

  // Show toast for error or success
  useEffect(() => {
    if (error) {
      toast.error(error, { position: "top-center" });
    }
  }, [error]);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password');
      toast.error('Please enter both username and password', { position: "top-center" });
      setIsLoading(false);
      return;
    }

    if (!isLoginMode && password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      toast.error('Passwords do not match', { position: "top-center" });
      setIsLoading(false);
      return;
    }

    try {
      let success;

      if (isLoginMode) {
        success = await login(username, password);
        if (success) {
          toast.success('Logged in successfully!', { position: "top-center" });
        }
      } else {
        // In signup mode
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters');
          toast.error('Password must be at least 6 characters', { position: "top-center" });
          setIsLoading(false);
          return;
        }
        success = await signup(username, password);
        if (success) {
          toast.success('Account created successfully!', { position: "top-center" });
        }
      }

      setIsLoading(false);

      if (!success && error) {
        setErrorMessage(error);
        toast.error(error, { position: "top-center" });
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred. Please try again.', { position: "top-center" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#111827] to-[#1f2937] p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-b from-blue-500 to-blue-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="py-8 px-6 text-center">
            <h1 className="text-white text-3xl font-bold mb-2">Color Prediction</h1>
            <p className="text-blue-200">{isLoginMode ? 'Log in to continue' : 'Create an account'}</p>
          </div>
          
          {/* Toggle buttons */}
          <div className="flex px-6">
            <button
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 py-2 text-center font-medium ${
                isLoginMode 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 py-2 text-center font-medium ${
                !isLoginMode 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              Sign up
            </button>
          </div>
          
          {/* Form */}
          <div className="bg-gradient-to-b from-[#1a1f35] to-[#131829] px-6 py-8 rounded-t-3xl -mt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                  <p>{errorMessage}</p>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-blue-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-800 text-white w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blue-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 text-white w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700"
                  placeholder={isLoginMode ? "Enter your password" : "Create a password (min 6 characters)"}
                />
              </div>

              {!isLoginMode && (
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-blue-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-800 text-white w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700"
                    placeholder="Confirm your password"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white ${
                    isLoading 
                      ? 'bg-blue-700 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                  } transition-all`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isLoginMode ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : isLoginMode ? "Log In" : "Create Account"}
                </button>
              </div>

              <div className="text-center mt-4 pt-3">
                <p className="text-sm text-blue-300">
                  {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button"
                    onClick={toggleMode}
                    className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none"
                  >
                    {isLoginMode ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;