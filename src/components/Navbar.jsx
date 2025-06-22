import React, { useState, useCallback } from 'react';
import Deposit from './Deposit';
import Withdrawal from './Withdrawal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // User panel state and logic (moved from GameBoard)
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [userInfo, setUserInfo] = useState({ username: '', balance: null });
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfoError, setUserInfoError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);

  // Helper to check if JWT is expired
  function isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // Helper to refresh access token using refresh token
  const tryRefreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await fetch('https://color-prediction-742i.onrender.com/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
        return null;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
      navigate('/login', { replace: true });
      return null;
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login', { replace: true });
      return null;
    }
  }, [navigate]);

  // Helper to get a valid access token, refresh if needed, redirect if refresh fails
  const getValidAccessToken = useCallback(async () => {
    let accessToken = localStorage.getItem('access_token');
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken;
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) return refreshed;
    return null;
  }, [tryRefreshToken]);

  // Fetch user info (balance and username)
  const fetchUserInfo = useCallback(async () => {
    setUserInfoLoading(true);
    setUserInfoError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setUserInfoError('No authentication token found.');
        setUserInfoLoading(false);
        return;
      }
      const res = await fetch('https://color-prediction-742i.onrender.com/users/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setUserInfoError('Failed to fetch user info');
        setUserInfoLoading(false);
        return;
      }
      const data = await res.json();
      const userObj = Array.isArray(data) && data.length > 0 ? data[0] : {};
      setUserInfo({
        username: userObj.username || '',
        balance: userObj.wallet && typeof userObj.wallet.balance === 'number' ? userObj.wallet.balance : null,
      });
    } catch (err) {
      setUserInfoError('Failed to fetch user info');
    } finally {
      setUserInfoLoading(false);
    }
  }, [getValidAccessToken]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    setTransactions([]);
    let token = await getValidAccessToken();
    if (!token) {
      setTransactionsError('No authentication token found.');
      setTransactionsLoading(false);
      return;
    }
    try {
      const res = await fetch('https://color-prediction-742i.onrender.com/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions.');
      const data = await res.json();
      let txns = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : (Array.isArray(data) ? data : []);
      setTransactions(txns);
    } catch (err) {
      setTransactionsError(err.message || 'An error occurred.');
    } finally {
      setTransactionsLoading(false);
    }
  }, [getValidAccessToken]);

  // Open user panel and fetch info
  const handleOpenUserPanel = () => {
    setShowUserPanel(true);
    fetchUserInfo();
    fetchTransactions();
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');
    if (!oldPassword || !newPassword || !confirmNewPassword) {
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
      let token = await getValidAccessToken();
      if (!token) {
        setChangePasswordError('No authentication token found.');
        setChangePasswordLoading(false);
        return;
      }
      const res = await fetch('https://color-prediction-742i.onrender.com/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }
      setChangePasswordSuccess('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setChangePasswordError(err.message || 'Failed to change password.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <>
      <nav className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0a1a3a] to-[#1a237e] rounded-xl shadow-lg mb-4" style={{ minHeight: 54 }}>
        {/* Logo (left) */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-extrabold text-2xl tracking-tight select-none" style={{ letterSpacing: '1px' }}>
            69<span className="text-white">EXCH</span>
          </span>
        </div>
        {/* Deposit & Withdrawal & Account (right) */}
        <div className="flex items-center gap-2">
          <Deposit onClick={() => navigate('/Deposit')} />
          <Withdrawal onClick={() => navigate('/Withdrawl')} />
          <button
            onClick={handleOpenUserPanel}
            className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg border-2 border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Account"
            aria-label="Account"
          >
            {/* User icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
      </nav>
      {/* User Management Panel */}
      {showUserPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto relative border border-blue-300">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-blue-400">
              <h2 className="text-white text-xl font-bold">User Management</h2>
              <button
                onClick={() => setShowUserPanel(false)}
                className="text-white text-2xl font-bold hover:text-blue-200"
              >
                ×
              </button>
            </div>
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* User Info (Balance & Username) */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-2 border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                      <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {userInfo.username ? userInfo.username : "User"}
                  </div>
                </div>
                <div className="text-sm text-white font-semibold bg-blue-900 bg-opacity-70 px-4 py-2 rounded-lg shadow border border-blue-700 min-w-[120px] text-center">
                  {userInfoLoading ? (
                    <span className="text-blue-200">Loading...</span>
                  ) : userInfoError ? (
                    <span className="text-red-300">--</span>
                  ) : (
                    <>
                      <span className="text-yellow-300">₹</span>
                      <span className="ml-1">{userInfo.balance !== null ? userInfo.balance : '--'}</span>
                    </>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <button
                  onClick={() => setShowChangePassword((v) => !v)}
                  className="flex-1 bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white py-3 rounded-lg font-bold shadow-md transition-all"
                >
                  Change Password
                </button>
                <button
                  onClick={() => { setShowUserPanel(false); logout(); }}
                  className="flex-1 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-3 rounded-lg font-bold shadow-md transition-all"
                >
                  Logout
                </button>
              </div>
              {/* Change Password Form */}
              {showChangePassword && (
                <form onSubmit={handleChangePassword} className="bg-blue-900 bg-opacity-60 rounded-lg p-4 space-y-3">
                  <div className="text-white font-bold mb-2">Change Password</div>
                  {changePasswordError && (
                    <div className="text-red-300 text-sm">{changePasswordError}</div>
                  )}
                  {changePasswordSuccess && (
                    <div className="text-green-300 text-sm">{changePasswordSuccess}</div>
                  )}
                  <input
                    type="password"
                    placeholder="Old Password"
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white mb-2"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white mb-2"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white mb-2"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white py-2 rounded-lg font-bold mt-2"
                  >
                    {changePasswordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              )}
              {/* Transactions */}
              <div>
                <div className="text-white font-bold mb-2">Transactions</div>
                {transactionsLoading ? (
                  <div className="text-blue-200 py-4">Loading transactions...</div>
                ) : transactionsError ? (
                  <div className="text-red-300 py-4">{transactionsError}</div>
                ) : transactions.length === 0 ? (
                  <div className="text-blue-200 py-4">No transactions found.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...transactions].reverse().map((txn, idx) => {
                      let typeLabel = '';
                      let typeColor = '';
                      if (txn.type_ === 'bet') {
                        typeLabel = 'Bet Placed';
                        typeColor = 'bg-blue-700 text-blue-200';
                      } else if (txn.type_ === 'deposit') {
                        typeLabel = 'Deposit';
                        typeColor = 'bg-green-700 text-green-200';
                      } else if (txn.type_ === 'withdraw') {
                        typeLabel = 'Withdrawal';
                        typeColor = 'bg-red-700 text-red-200';
                      } else {
                        typeLabel = txn.type_ || 'Transaction';
                        typeColor = 'bg-gray-700 text-gray-200';
                      }
                      const dateStr = txn.created_at
                        ? new Date(txn.created_at).toLocaleString()
                        : '';
                      const amount = txn.amount;
                      const amountStr = amount > 0 ? `+${amount}` : `${amount}`;
                      const amountColor =
                        amount > 0
                          ? 'text-green-400'
                          : amount < 0
                          ? 'text-red-400'
                          : 'text-blue-200';
                      return (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-3 flex justify-between items-center shadow"
                        >
                          <div>
                            <div className={`font-bold px-2 py-1 rounded ${typeColor} inline-block mb-1`}>
                              {typeLabel}
                            </div>
                            <div className="text-blue-200 text-xs">{dateStr}</div>
                          </div>
                          <div className={`font-bold text-lg ${amountColor}`}>
                            {amountStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
