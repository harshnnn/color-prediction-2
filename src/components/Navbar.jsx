import React, { useState, useCallback } from 'react';
import Deposit from './Deposit';
import Withdrawal from './Withdrawal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // User panel state and logic (moved from GameBoard)
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
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
      // API now returns a single user object, not an array
      setUserInfo({
        username: data.username || '',
        balance: data.wallet && typeof data.wallet.balance === 'number' ? data.wallet.balance : null,
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
    if (!newPassword || !confirmNewPassword) {
      setChangePasswordError('All fields are required.');
      toast.error('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      toast.error('New passwords do not match.');
      return;
    }
    setChangePasswordLoading(true);
    try {
      let token = await getValidAccessToken();
      if (!token) {
        setChangePasswordError('No authentication token found.');
        toast.error('No authentication token found.');
        setChangePasswordLoading(false);
        return;
      }
      const res = await fetch('https://color-prediction-742i.onrender.com/auth/password_reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChangePasswordError(data.message || 'Failed to change password.');
        toast.error(data.message || 'Failed to change password.');
        setChangePasswordLoading(false);
        return;
      }
      setChangePasswordSuccess('Password changed successfully!');
      toast.success(data.message || 'Password changed successfully!');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setChangePasswordError(err.message || 'Failed to change password.');
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <>
      {/* Responsive Navbar */}
      <nav className="w-full mb-0 pb-0">
        {/* Mobile: Top Row */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0a1a3a] to-[#1a237e] rounded-xl shadow-lg min-h-[54px] sm:hidden">
          {/* Logo */}
          <span className="text-yellow-400 font-extrabold text-2xl tracking-tight select-none" style={{ letterSpacing: '1px' }}>
            99<span className="text-white">EXCH</span>
          </span>
          {/* Profile/User Button */}
          <button
            onClick={handleOpenUserPanel}
            className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Account"
            aria-label="Account"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
        {/* Mobile: Bottom Row */}
        <div className="flex items-center  justify-center gap-2 px-3 pb-2 sm:hidden">
          <button
            onClick={() => navigate('/Deposit')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow text-base"
            style={{ minWidth: 0 }}
          >
            <i className="fa fa-piggy-bank text-lg"></i>
            DEPOSIT
          </button>
          <button
            onClick={() => navigate('/Withdrawl')}
            className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-2 rounded shadow text-base"
            style={{ minWidth: 0 }}
          >
            <i className="fa fa-exchange-alt text-lg"></i>
            WITHDRAWAL
          </button>
        </div>
        {/* Desktop/Tablet: Original Navbar */}
        <div className="hidden sm:flex w-full flex-wrap items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0a1a3a] to-[#1a237e] rounded-xl shadow-lg min-h-[54px]">
          {/* Logo (left) */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-extrabold text-2xl tracking-tight select-none" style={{ letterSpacing: '1px' }}>
              99<span className="text-white">EXCH</span>
            </span>
          </div>
          {/* Deposit & Withdrawal & Account (right) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Deposit onClick={() => navigate('/Deposit')} />
            <Withdrawal onClick={() => navigate('/Withdrawl')} />
            <button
              onClick={handleOpenUserPanel}
              className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg border-2 border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Account"
              aria-label="Account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      {/* User Management Panel */}
      {showUserPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-bl-sm">
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-2xl shadow-2xl w-full max-w-lg mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto relative border border-blue-300">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-blue-400">
              <h2 className="text-white text-xl font-bold">User Management</h2>
              <button
                onClick={() => setShowUserPanel(false)}
                className="text-white text-2xl font-bold hover:text-blue-200"
              >
                ×
              </button>
            </div>
            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* User Info (Balance & Username) */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-2 border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                      <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <div className="text-white text-lg font-bold break-all">
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
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
                      // Determine amount sign
                      const amountStr = txn.debit
                        ? `-${txn.amount}`
                        : `+${txn.amount}`;
                      const amountColor =
                        txn.debit
                          ? 'text-red-400'
                          : 'text-green-400';

                      // Determine remark label
                      let remarkLabel = '';
                      if (txn.remark && txn.remark.startsWith('Casino[')) {
                        remarkLabel = 'Bet';
                      } else if (txn.remark === 'Withdraw') {
                        remarkLabel = 'Withdraw';
                      } else if (txn.remark === 'Deposit') {
                        remarkLabel = 'Deposit';
                      } else {
                        remarkLabel = txn.remark || 'Transaction';
                      }

                      // Date string
                      const dateStr = txn.created_at
                        ? new Date(txn.created_at).toLocaleString()
                        : '';

                      return (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-3 flex justify-between items-center shadow"
                        >
                          <div>
                            <div className="font-medium px-2 py-1 rounded bg-gray-700 text-gray-200 inline-block mb-1">
                              Remark - {remarkLabel}
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
