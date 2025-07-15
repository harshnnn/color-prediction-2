import React, { useState, useCallback, useEffect, useRef } from 'react';
import Deposit from './Deposit';
import Withdrawal from './Withdrawal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaChevronDown } from "react-icons/fa";


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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    // Fetch user info on component mount
    fetchUserInfo();
  }, [fetchUserInfo]);

  // Ensure user info is fetched independently of the User Management Panel
  const handleOpenUserPanel = () => {
    setShowUserPanel(true);
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

  // Function to toggle dropdown visibility
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <>
      {/* Responsive Navbar */}
      <nav className="w-full mb-0 pb-0">
        <div className='bg-gradient-to-r from-[#0a1a3a] to-[#1a237e] rounded-xl shadow-lg min-h-[54px] sm:hidden'>     {/* Mobile: Top Row */}
          {/* Mobile: Top Row */}
          <div className="flex items-center justify-between px-3 pt-2 ">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="text-yellow-400 font-extrabold text-2xl tracking-tight select-none focus:outline-none hover:text-yellow-500"
              style={{ letterSpacing: '1px' }}
            >
              99<span className="text-white">EXCH</span>
            </button>
            {/* Hidden div visible on click */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="text-white flex items-center justify-center gap-2 text-md font-md break-all cursor-pointer"
                onClick={toggleDropdown}
              >
                {userInfo.username ? userInfo.username : "User"}
                <span className='pt-1'><FaChevronDown /></span>
              </div>
              {isDropdownOpen && (
                <div className="absolute flex flex-col bg-white shadow-lg rounded-lg p-2 mt-0 right-0 w-40">
                  <button
                    onClick={() => navigate('/')}
                    className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                  >
                    Home
                  </button>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                  >
                    Transactions
                  </button>
                  <button
                    onClick={() => navigate('/change-password')}
                    className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => logout()}
                    className="text-red-700 hover:text-red-900 px-4 py-2 text-sm text-left hover:underline "
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Mobile: Bottom Row */}
          <div className="flex items-center justify-around mr-3 py-2 ">
            <button
              onClick={() => navigate('/Deposit')}
              className="text-center text-white px-1 py-1 uppercase  flex items-center justify-center rounded border border-white m-1 no-underline"
              style={{ fontSize: '12px', fontWeight: '900', padding: '5px', margin: '0 5px', background: 'linear-gradient(180deg, #007b15, #138e00)' }}
            >
              <img src="/buttons/deposit-icon.webp" alt="Deposit Icon" className="w-5 h-5" style={{ filter: 'invert(1)', marginRight: '5px', width: '25px' }} />
              DEPOSIT
            </button>
            <button
              onClick={() => navigate('/Withdrawl')}
              className="text-center text-white px-1 py-1 uppercase  flex items-center justify-center rounded  border border-white m-1 no-underline"
              style={{ fontSize: '12px', fontWeight: '900', padding: '5px', margin: '0 5px', background: 'linear-gradient(180deg,#7b0000,#d10000)' }}
            >
              <img src="/buttons/withdrawal-icon.webp" alt="Deposit Icon" className="w-5 h-5" style={{ filter: 'invert(1)', marginRight: '5px', width: '25px' }} />
              WITHDRAWAL
            </button>
          </div>
        </div>


        {/* Desktop/Tablet: Original Navbar */}
        <div className="hidden sm:flex w-full flex-wrap items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0a1a3a] to-[#1a237e] rounded-xl shadow-lg min-h-[54px]">
          {/* Logo (left) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-yellow-400 font-extrabold text-2xl tracking-tight select-none focus:outline-none hover:text-yellow-500"
              style={{ letterSpacing: '1px' }}
            >
              99<span className="text-white">EXCH</span>
            </button>
          </div>

          {/* Deposit & Withdrawal & Account (right) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Deposit onClick={() => navigate('/Deposit')} />
            <Withdrawal onClick={() => navigate('/Withdrawl')} />

            {/* Balance and Username */}
            <div className="flex items-center gap-2">

              <div className="text-sm text-white font-semibold bg-blue-900 bg-opacity-70 px-4 py-2 rounded-lg shadow border border-blue-700 min-w-[120px] text-center">
                {userInfoLoading ? (
                  <span className="text-blue-200">Loading...</span>
                ) : userInfoError ? (
                  <span className="text-red-300">--</span>
                ) : (
                  <>
                    <span className="text-white">Balance: </span>
                    <span className="ml-1 font-bold">{userInfo.balance !== null ? userInfo.balance : '--'}</span>
                  </>
                )}
              </div>

            </div>
            {/* Hidden div visible on hover */}
            <div className="relative group">
              <div className="text-white flex items-center justify-center gap-2 text-md font-md break-all cursor-pointer">
                {userInfo.username ? userInfo.username : "User"}
                <span className='pt-1'><FaChevronDown /></span>
              </div>
              <div className="absolute hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg p-2 mt-0 right-0 w-40">
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                >
                  Transactions
                </button>
                <button
                  onClick={() => navigate('/change-password')}
                  className="text-blue-700 hover:text-blue-900 px-4 py-2 text-sm text-left hover:underline "
                >
                  Change Password
                </button>
                <button
                  onClick={() => logout()}
                  className="text-red-700 hover:text-red-900 px-4 py-2 text-sm text-left hover:underline "
                >
                  Logout
                </button>
              </div>
            </div>

            {/* user panel button */}
            {/* <button
              onClick={handleOpenUserPanel}
              className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg border-2 border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Account"
              aria-label="Account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-7 8-7s8 3 8 7" />
              </svg>
            </button>  */}
          </div>


        </div>
      </nav>
      {/* User Management Panel */}

    </>
  );
};

export default Navbar;
