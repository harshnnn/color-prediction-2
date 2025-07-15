import React, { useState } from 'react';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const { getValidAccessToken } = useAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!newPassword || !confirmNewPassword) {
      setChangePasswordError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        setChangePasswordError('No authentication token found.');
        setChangePasswordLoading(false);
        return;
      }

      const res = await fetch('https://color-prediction-742i.onrender.com/auth/password_reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChangePasswordError(data.message || 'Failed to change password.');
        setChangePasswordLoading(false);
        return;
      }

      setChangePasswordSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setChangePasswordError(err.message || 'Failed to change password.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4 text-center">Change Password</h1>
        <form onSubmit={handleChangePassword} className="bg-gray-800 rounded-lg p-6 shadow-md max-w-md mx-auto">
          {changePasswordError && (
            <div className="text-red-400 text-sm mb-4">{changePasswordError}</div>
          )}
          {changePasswordSuccess && (
            <div className="text-green-400 text-sm mb-4">{changePasswordSuccess}</div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              className="w-full px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
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
            />
          </div>
          <button
            type="submit"
            disabled={changePasswordLoading}
            className="w-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {changePasswordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
