import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import apiClient from '../api/apiClient';
import { ToastContainer, toast } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // State for real-time validation errors
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Real-time validation for new password length
  useEffect(() => {
    if (newPassword && newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
    } else {
      setPasswordError('');
    }
  }, [newPassword]);

  // Real-time validation for password confirmation match
  useEffect(() => {
    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      setConfirmPasswordError('Passwords do not match.');
    } else {
      setConfirmPasswordError('');
    }
  }, [newPassword, confirmNewPassword]);


  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Final check before submitting to prevent API call with invalid data
    if (passwordError || confirmPasswordError || !newPassword || !confirmNewPassword) {
      toast.error('Please fix the errors before submitting.');
      return;
    }

    setChangePasswordLoading(true);
    const toastId = toast.loading("Updating your password...");

    try {
      const res = await apiClient('/auth/password_reset', {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }

      toast.update(toastId, { 
        render: "Password changed successfully!", 
        type: "success", 
        isLoading: false, 
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
      });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.update(toastId, { 
        render: err.message || 'An unexpected error occurred.', 
        type: "error", 
        isLoading: false, 
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
      });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen text-white">
      {/* ADDED: ToastContainer to render notifications */}
      <ToastContainer
        position="top-center"
        theme="dark"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4 text-center">Change Password</h1>
        <form onSubmit={handleChangePassword} className="bg-gray-800 rounded-lg p-6 shadow-md max-w-md mx-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {/* Real-time error message */}
            {passwordError && <p className="text-red-400 text-xs mt-1">{passwordError}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              type="password"
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
            {/* Real-time error message */}
            {confirmPasswordError && <p className="text-red-400 text-xs mt-1">{confirmPasswordError}</p>}
          </div>
          <button
            type="submit"
            disabled={changePasswordLoading || !!passwordError || !!confirmPasswordError}
            className="w-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changePasswordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
