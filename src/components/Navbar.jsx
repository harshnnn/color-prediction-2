import React, { useState, useCallback, useEffect, useRef } from 'react';
import Deposit from './Deposit';
import Withdrawal from './Withdrawal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaChevronDown } from "react-icons/fa";
import apiClient from '../api/apiClient'; // Import the apiClient

const Navbar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // User panel state and logic
  const [userInfo, setUserInfo] = useState({ username: '', balance: null });
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfoError, setUserInfoError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch user info (balance and username) using apiClient
  const fetchUserInfo = useCallback(async () => {
    setUserInfoLoading(true);
    setUserInfoError(null);
    try {
      const res = await apiClient('/users'); // apiClient handles auth
      if (!res.ok) {
        throw new Error('Failed to fetch user info');
      }
      const data = await res.json();
      setUserInfo({
        username: data.username || '',
        balance: data.wallet?.balance ?? null,
      });
    } catch (err) {
      setUserInfoError('Failed to fetch user info. Your session may have expired.');
    } finally {
      setUserInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch user info on component mount
    fetchUserInfo();
  }, [fetchUserInfo]);

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
              <div className='flex gap-2'>
                <div className="text-sm text-white font-sm bg-blue-900 bg-opacity-70 px-1 py-1 rounded-lg shadow border border-blue-700 min-w-[60px] text-center">
                  {userInfoLoading ? (
                    <span className="text-blue-200">Loading...</span>
                  ) : userInfoError ? (
                    <span className="text-red-300">--</span>
                  ) : (
                    <>
                      <span className="text-white">Balance: </span>
                      <span className="ml-1 font-md">{userInfo.balance !== null ? userInfo.balance : '--'}</span>
                    </>
                  )}
                </div>
                <div
                  className="text-white flex items-center justify-center gap-2 text-md font-md break-all cursor-pointer"
                  onClick={toggleDropdown}
                >
                  {userInfo.username ? userInfo.username : "User"}
                  <span className='pt-1'><FaChevronDown /></span>
                </div>
              </div>

              {isDropdownOpen && (
                <div className="absolute flex flex-col bg-white shadow-lg rounded-lg p-2 mt-0 right-0 w-40 z-50">
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
              <div className="absolute hidden group-hover:flex flex-col bg-white shadow-lg rounded-lg p-2 mt-0 right-0 w-40 z-50">
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
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
