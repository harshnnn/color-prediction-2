import React, { useState, useEffect, useRef, useCallback } from 'react';
import Timer from './Timer';
import { useAuth } from '../context/AuthContext';


const GAME_TYPES = [
  { label: 'Win Go 30Sec', duration: 30 },
  { label: 'Win Go 1Min', duration: 60 },
  { label: 'Win Go 3Min', duration: 180 },
  { label: 'Win Go 5Min', duration: 300 },
];

const COLOR_LABELS = {
  green: 'Green',
  violet: 'Violet',
  red: 'Red',
};

const COLOR_CLASSES = {
  green: 'text-green-500',
  violet: 'text-purple-500',
  red: 'text-red-500',
};

const NUMBER_COLORS = {
  0: 'violet',
  1: 'green',
  2: 'red',
  3: 'green',
  4: 'red',
  5: 'violet',
  6: 'red',
  7: 'green',
  8: 'red',
  9: 'green',
};

// Helper to get color and big/small from number
function getColorAndBigSmall(number) {
  let color = '';
  if (number === 0 || number === 5) color = 'violet';
  else if (number % 2 === 1) color = 'green';
  else color = 'red';
  const bigSmall = number < 5 ? 'Small' : 'Big';
  return { color, bigSmall };
}

// Parse period string as UTC date
function parsePeriodToUTCDate(period) {
  // period: "20250610111829" => 2025-06-10T11:18:29Z (Z = UTC)
  const year = period.slice(0, 4);
  const month = period.slice(4, 6);
  const day = period.slice(6, 8);
  const hour = period.slice(8, 10);
  const min = period.slice(10, 12);
  const sec = period.slice(12, 14);
  return new Date(Date.UTC(year, month - 1, day, hour, min, sec));
}

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
async function getValidAccessToken() {
  let accessToken = localStorage.getItem('access_token');
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch('https://color-prediction-742i.onrender.com/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      // Remove tokens if refresh fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

function GameBoard() {
  const { logout } = useAuth();

  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [selectedBigSmall, setSelectedBigSmall] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [agree, setAgree] = useState(false);
  const [balance] = useState(1000);
  const [betHistory, setBetHistory] = useState([]);
  const [period, setPeriod] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [nextPeriodInfo, setNextPeriodInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsReady, setWsReady] = useState(false);
  const [wsTimeout, setWsTimeout] = useState(false);
  const [balancePerBet, setBalancePerBet] = useState(1);
  const [betPlacing, setBetPlacing] = useState(false);
  const [betPlaceError, setBetPlaceError] = useState(null);
  // Add these state variables for API bets (move to top-level with other useState)
  const [apiBets, setApiBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(false);
  const [betsError, setBetsError] = useState(null);
  // Transaction state
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 1. Fetch result history only once on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://color-prediction-742i.onrender.com/results');
        const data = await res.json();
        const mapped = data
          .filter(r => r.number !== -1)
          .map(r => ({
            ...r,
            ...getColorAndBigSmall(r.number)
          }));
        setResultHistory(mapped);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // 2. WebSocket: Only connect once on mount
  useEffect(() => {
    const ws = new WebSocket('wss://color-prediction-742i.onrender.com/ws');
    ws.onopen = () => {
      setWsReady(true);
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      const msg = event.data.trim();

      // Period/start-time message
      if (/^\d{14} \d{4}-\d{2}-\d{2}/.test(msg)) {
        const [periodStr, ...rest] = msg.split(' ');
        const startTimeStr = rest.join(' ').replace(/\.\d+/, '');
        const startTime = new Date(startTimeStr);
        const now = new Date();
        let elapsed = Math.floor((now - startTime) / 1000);
        let diff = 30 - elapsed;
        if (diff < 0) diff = 0;
        if (diff > 30) diff = 30;

        if (showResult) {
          setNextPeriodInfo({ periodStr, diff });
        } else {
          setPeriod(periodStr);
          setTimeLeft(diff);
        }
      }
      // Result message
      else if (/^\d{14} \d+$/.test(msg)) {
        const [periodStr, numberStr] = msg.split(' ');
        const number = parseInt(numberStr, 10);
        const { color, bigSmall } = getColorAndBigSmall(number);
        const result = { period: periodStr, number, color, bigSmall };

        setRoundResult(result);
        setShowResult(true);

        // Use functional updates to avoid stale closures
        setResultHistory(prev => {
          if (prev.find(r => r.period === result.period)) return prev;
          return [{ ...result }, ...prev.slice(0, 19)];
        });

        setBetHistory(prev =>
          prev.map(bet =>
            bet.period === result.period ? { ...bet, result } : bet
          )
        );

        setTimeout(() => {
          setShowResult(false);
          setShowBetModal(false);
        }, 3000);
      }
    };
    ws.onerror = (err) => {
      setWsReady(false);
      console.error('WebSocket error:', err);
    };
    ws.onclose = () => {
      setWsReady(false);
      console.log('WebSocket closed');
    };
    return () => ws.close();
  }, []); // Only once on mount

  // 3. Timer logic: only restart timer when period changes
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (timeLeft <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [period]);

  // 4. Handle next period info after result modal closes
  useEffect(() => {
    if (!showResult && nextPeriodInfo) {
      setPeriod(nextPeriodInfo.periodStr);
      setTimeLeft(nextPeriodInfo.diff);
      setNextPeriodInfo(null);
    }
  }, [showResult, nextPeriodInfo]);

  // 5. Use useCallback for handlers passed to children (optional, for large lists)
  const handleGameTypeChange = useCallback((type) => {
    setGameType(type);
    setShowBetModal(false);
    setSelectedColor(null);
    setSelectedNumber(null);
    setSelectedBigSmall(null);
    setQuantity(1);
    setAgree(false);
    setShowResult(false);
    setRoundResult(null);
    //setTimeLeft(type.duration);
  }, []);

  const handleColorClick = (color) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedColor(color);
      setSelectedNumber(null);
      setSelectedBigSmall(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleNumberClick = (num) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedNumber(num);
      setSelectedColor(null);
      setSelectedBigSmall(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleBigSmallClick = (bigSmall) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedBigSmall(bigSmall);
      setSelectedColor(null);
      setSelectedNumber(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleQuantity = (val) => {
    setQuantity((prev) => Math.max(1, prev + val));
  };

  const handleSetQuantity = (val) => {
    setQuantity(val);
  };

  // Helper to get prediction string for API
  const getPredictionString = () => {
    if (selectedColor) return selectedColor;
    if (selectedBigSmall) return selectedBigSmall.toLowerCase();
    if (selectedNumber !== null && selectedNumber !== undefined) {
      // Map 0-9 to "zero", "one", ..., "nine"
      const numWords = ["zero","one","two","three","four","five","six","seven","eight","nine"];
      return numWords[selectedNumber];
    }
    return "";
  };

  const handlePlaceBet = async () => {
    if (!agree || timeLeft <= 5 || showResult) return;
    setBetPlaceError(null);
    setBetPlacing(true);

    const prediction = getPredictionString();
    const amount = balancePerBet * quantity;
    const payload = {
      amount,
      prediction,
      period,
    };

    try {
      let token = await getValidAccessToken();
      if (!token) {
        setBetPlaceError("No authentication token found.");
        setBetPlacing(false);
        return;
      }
      const res = await fetch('https://color-prediction-742i.onrender.com/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to place bet.");
      }
      setShowBetModal(false);
    } catch (err) {
      setBetPlaceError(err.message || "Failed to place bet.");
    } finally {
      setBetPlacing(false);
    }
  };

  // Format seconds as MM:SS
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (!wsReady) {
      const timeout = setTimeout(() => setWsTimeout(true), 8000); // 8 seconds
      return () => clearTimeout(timeout);
    } else {
      setWsTimeout(false);
    }
  }, [wsReady]);

  // Helper to fetch bets from API
  const fetchApiBets = useCallback(async () => {
    setBetsLoading(true);
    setBetsError(null);
    setApiBets([]);
    let token = await getValidAccessToken();
    if (!token) {
      setBetsError('No authentication token found.');
      setBetsLoading(false);
      return;
    }
    try {
      const res = await fetch('https://color-prediction-742i.onrender.com/bets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch bets.');
      const data = await res.json();
      setApiBets(Array.isArray(data) ? data : (Array.isArray(data.bets) ? data.bets : []));
    } catch (err) {
      setBetsError(err.message || 'An error occurred.');
    } finally {
      setBetsLoading(false);
    }
  }, []);

  // Fetch bets when "My Bets" tab is selected
  useEffect(() => {
    if (activeTab === 'mybets') {
      fetchApiBets();
    }
  }, [activeTab, fetchApiBets]);

  // Fetch bets when a new period starts (i.e., after result, new timer)
  useEffect(() => {
    if (activeTab === 'mybets' && period) {
      fetchApiBets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Fetch bets after placing a bet (if on mybets tab)
  useEffect(() => {
    if (!betPlacing && activeTab === 'mybets' && showBetModal === false) {
      fetchApiBets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betPlacing, showBetModal]);

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
      // The API returns a nested array, so flatten it
      let txns = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : (Array.isArray(data) ? data : []);
      setTransactions(txns);
    } catch (err) {
      setTransactionsError(err.message || 'An error occurred.');
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Open user panel and fetch transactions
  const handleOpenUserPanel = () => {
    setShowUserPanel(true);
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

  if (loading || !wsReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-200"></div>
          <div className="text-blue-700 font-bold text-xl">
            {wsTimeout
              ? "Unable to connect to game server. Please check your connection or try again later."
              : "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  
  // Main wrapper with improved background gradient
  return (
    <div className="relative flex flex-col items-center min-w-[340px] bg-gradient-to-b from-[#111827] to-[#1f2937] min-h-screen p-4">
      {/* User Management Panel Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleOpenUserPanel}
          className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
        >
          Account
        </button>
      </div>

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
                      // Map type_ to friendly label and color
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
                      // Format date/time
                      const dateStr = txn.created_at
                        ? new Date(txn.created_at).toLocaleString()
                        : '';
                      // Amount with sign
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

      {/* Overlay for last 5 seconds */}
      {timeLeft <= 5 && !showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent transition-all">
          <div className="flex gap-4">
            <div className="bg-blue-700 rounded-xl w-28 h-40 flex items-center justify-center">
              <span className="text-[96px] font-extrabold text-blue-200 leading-none">
                {String(Math.floor(timeLeft / 10))}
              </span>
            </div>
            <div className="bg-blue-700 rounded-xl w-28 h-40 flex items-center justify-center">
              <span className="text-[96px] font-extrabold text-blue-200 leading-none">
                {String(timeLeft % 10)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal - Enhanced with animations */}
      {showResult && roundResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-b from-blue-500 to-blue-700 rounded-3xl shadow-2xl px-8 pt-8 pb-8 max-w-[90%] w-[400px] mx-4 relative border border-blue-300 animate-bounceIn">
            {/* Trophy Icon with animation */}
            <div className="flex justify-center mb-6">
              <div className="text-6xl animate-bounce">🏆</div>
            </div>

            {/* Round Result Title */}
            <div className="text-center mb-6">
              <h2 className="text-white text-2xl font-bold">Round Result</h2>
            </div>

            {/* Main Number Display with animation */}
            <div className="flex items-center justify-center mb-8">
              <span className={`text-[120px] font-black drop-shadow-xl ${COLOR_CLASSES[roundResult.color]} leading-none animate-scaleIn`}>
                {roundResult.number}
              </span>
            </div>

            {/* Tags - Big/Small and Color - Enhanced */}
            <div className="flex justify-center gap-4 mb-2">
              <span className={`px-5 py-2 rounded-full text-sm font-bold uppercase ${roundResult.bigSmall === 'Big'
                ? 'bg-blue-600 text-white'
                : 'bg-orange-500 text-white'
                } shadow-lg`}>
                {roundResult.bigSmall}
              </span>
              <span className={`px-5 py-2 rounded-full text-sm font-bold uppercase ${roundResult.color === 'green'
                ? 'bg-green-500 text-white' :
                roundResult.color === 'red'
                  ? 'bg-red-500 text-white' :
                  'bg-purple-500 text-white'
                } shadow-lg`}>
                {COLOR_LABELS[roundResult.color]}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Main UI, faded when last 5 seconds or result */}
      <div className={timeLeft <= 5 || showResult ? "pointer-events-none opacity-30 transition-all" : ""}>
        {/* Game Type Selection - Enhanced with animations */}
        <div className="flex gap-2 mb-6 w-full justify-center">
          {GAME_TYPES.map((type) => (
            <button
              key={type.label}
              className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl font-bold transition-all transform hover:scale-105 ${gameType.label === type.label
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg scale-105 border-2 border-blue-300'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              onClick={() => handleGameTypeChange(type)}
            >
              <div className="text-xl mb-1">🕐</div>
              <div className="text-xs text-center leading-tight">
                <div>Win Go</div>
                <div className="font-normal">
                  {type.label.includes('30Sec') ? '30Sec' :
                    type.label.includes('1Min') ? '1Min' :
                      type.label.includes('3Min') ? '3Min' : '5Min'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Timer and Period Section - Modern design */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white relative shadow-xl">
          {/* How to play button */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-3 left-3 bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 transition-colors shadow-md"
          >
            <span>📖</span>
            How to play
          </button>

          {/* Current Game Type */}
          <div className="text-center mb-3 pt-6">
            <div className="text-lg font-bold opacity-90">{gameType.label}</div>
          </div>

          {/* Previous Results - Enhanced design */}
          <div className="flex justify-center gap-2 mb-4">
            {resultHistory.slice(0, 5).map((res, idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 transform hover:scale-110 transition-transform shadow-lg ${res.color === 'green'
                  ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-300' :
                  res.color === 'red'
                    ? 'bg-gradient-to-br from-red-400 to-red-600 border-red-300' :
                    'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300'
                  }`}
              >
                {res.number}
              </div>
            ))}
          </div>

          {/* Time Remaining Label */}
          <div className="text-center mb-2">
            <div className="text-sm font-semibold opacity-90">Time remaining</div>
          </div>

          {/* Timer Display - Enhanced with animation */}
          <div className="flex justify-center gap-2 mb-4">
            {formatTime(timeLeft).split('').map((char, idx) => (
              <div
                key={idx}
                className={`${char === ':'
                  ? 'flex items-center text-2xl font-bold text-white'
                  : 'bg-gradient-to-b from-gray-800 to-gray-900 text-white rounded-lg w-12 h-14 flex items-center justify-center text-2xl font-bold shadow-lg transform transition-all ' +
                  (timeLeft <= 10 ? 'animate-pulse' : '')
                  }`}
              >
                {char}
              </div>
            ))}
          </div>

          {/* Period */}
          <div className="text-center">
            <div className="text-sm font-mono bg-blue-800 inline-block px-3 py-1 rounded-full">{period}</div>
          </div>
        </div>
        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-blue-500 to-blue-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">

              {/* Modal Header */}
              <div className="bg-blue-600 px-6 py-4 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-white text-lg font-bold">How to play</h2>
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="text-white text-xl font-bold hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 text-white overflow-y-auto max-h-[60vh]">
                <div className="space-y-4 text-sm leading-relaxed">
                  <p>
                    30 sec 1 issue, 25 sec to order, 5 seconds waiting for the
                    draw. It opens all day. The total number of trade is 2880 issues.
                  </p>
                  <p>
                    If you spend 100 to trade, after deducting service fee 2%, contract amount: 98
                  </p>

                  <div className="space-y-2">
                    <p>1. Select green: if the result shows 1,3,7,9 you will get (98*2) 196; If the result shows 5, you will get (98*1.5) 147</p>
                    <p>2. Select red: if the result shows 2,4,6,8 you will get (98*2) 196; If the result shows 0, you will get (98*1.5) 147</p>
                    <p>3. Select violet: if the result shows 0 or 5, you will get (98*2) 196</p>
                    <p>4. Select number: if the result is the same as the number you selected, you will get (98*9) 882</p>
                    <p>5. Select big: if the result shows 5,6,7,8,9 you will get (98*2) 196</p>
                    <p>6. Select small: if the result shows 0,1,2,3,4 you will get (98*2) 196</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="p-4">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-lg font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color Buttons - Enhanced with glassmorphism */}
        <div className="flex gap-2 mb-5 w-full justify-center">
          <button
            className="bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white w-full px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg transform hover:scale-105 hover:shadow-xl"
            onClick={() => handleColorClick('green')}
          >
            Green
          </button>
          <button
            className="bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white w-full px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg transform hover:scale-105 hover:shadow-xl"
            onClick={() => handleColorClick('violet')}
          >
            Violet
          </button>
          <button
            className="bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white w-full px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg transform hover:scale-105 hover:shadow-xl"
            onClick={() => handleColorClick('red')}
          >
            Red
          </button>
        </div>

        {/* Number Buttons - Enhanced with animations */}
        <div className="flex flex-col gap-3 mb-5 w-full justify-center">
          {/* First row: 0-4 */}
          <div className="flex gap-3 justify-center">
            {[0, 1, 2, 3, 4].map((num) => (
              <button
                key={num}
                className={`w-14 h-14 rounded-full font-bold text-white text-xl flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${NUMBER_COLORS[num] === 'green' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                  NUMBER_COLORS[num] === 'red' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                    'bg-gradient-to-br from-purple-400 to-purple-600'
                  }`}
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Second row: 5-9 */}
          <div className="flex gap-3 justify-center">
            {[5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className={`w-14 h-14 rounded-full font-bold text-white text-xl flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${NUMBER_COLORS[num] === 'green' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                  NUMBER_COLORS[num] === 'red' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                    'bg-gradient-to-br from-purple-400 to-purple-600'
                  }`}
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Big/Small Buttons - Enhanced design */}
        <div className="flex gap-3 mb-6 w-full max-w-md mx-auto justify-center">
          <button
            className="bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white w-full px-8 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all"
            onClick={() => handleBigSmallClick('Small')}
          >
            Small (0-4)
          </button>
          <button
            className="bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white w-full px-8 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all"
            onClick={() => handleBigSmallClick('Big')}
          >
            Big (5-9)
          </button>
        </div>

        {/* Bet Modal - Enhanced with glassmorphism */}
        {showBetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gradient-to-br from-[#1a1f35] to-[#131829] rounded-xl shadow-2xl w-[350px] p-0 relative border border-blue-400/30 animate-scaleIn">
              {/* Header */}
              <div className={`rounded-t-xl px-4 py-4 text-center ${selectedColor
                ? `bg-gradient-to-b from-${selectedColor}-500 to-${selectedColor}-600`
                : 'bg-gradient-to-b from-blue-500 to-blue-600'
                }`}>
                {/* Header content remains the same */}
                <div className="text-white font-bold text-xl">{gameType.label}</div>
                {/* Selection display logic... */}
              </div>

              <div className="p-5">
                {/* Balance */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white text-lg">Balance</span>
                  <div className="flex gap-2">
                    {[1, 10, 100, 1000].map((amt) => (
                      <button
                        key={amt}
                        className={`${balancePerBet === amt
                          ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-300 text-white'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200 hover:from-blue-600 hover:to-blue-700'
                          } px-3 py-2 rounded font-bold transition-all`}
                        onClick={() => setBalancePerBet(amt)}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white text-lg">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all" onClick={() => handleQuantity(-1)}>-</button>
                    <span className="bg-gray-800 text-white px-4 py-2 rounded min-w-[40px] text-center font-bold">{quantity}</span>
                    <button className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-all" onClick={() => handleQuantity(1)}>+</button>
                  </div>
                </div>

                {/* Multipliers - Enhanced buttons */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[1, 5, 10, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      className={`py-2 rounded font-bold transition-all ${quantity === val
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700'
                        }`}
                      onClick={() => handleSetQuantity(val)}
                    >
                      X{val}
                    </button>
                  ))}
                </div>

                {/* Agree checkbox with enhanced styling */}
                <div className="flex items-center mb-4 bg-gray-800 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={() => setAgree(!agree)}
                    className="w-5 h-5 accent-green-500 mr-3"
                    id="agree"
                  />
                  <label htmlFor="agree" className="text-white flex-1">I agree to the betting rules</label>
                  <span className="text-blue-400 text-xs cursor-pointer hover:underline">{`<Terms>`}</span>
                </div>

                {/* Action Buttons - Enhanced */}
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white py-3 rounded-lg font-bold transition-all"
                    onClick={() => setShowBetModal(false)}
                    disabled={betPlacing}
                  >
                    Cancel
                  </button>
                  <button
                    className={`flex-1 py-3 rounded-lg font-bold ${agree && timeLeft > 5 && !showResult && !betPlacing
                      ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white'
                      : 'bg-gradient-to-br from-green-600/50 to-green-700/50 text-white/70 cursor-not-allowed'
                      }`}
                    disabled={!agree || timeLeft <= 5 || showResult || betPlacing}
                    onClick={handlePlaceBet}
                  >
                    {betPlacing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Placing...
                      </span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span>Place Bet</span>
                        <span className="text-sm">{balancePerBet * quantity}</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game History */}


        {/* Tabs for History and My Bets - Enhanced */}
        <div className="flex gap-2 mb-3 w-full justify-center">
          <button
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            onClick={() => setActiveTab('history')}
          >
            Game History
          </button>
          <button
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'mybets'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            onClick={() => setActiveTab('mybets')}
          >
            My Bets
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' ? (
          // Game History Table with mobile-responsive grid
          <div className="w-full">
            {/* Table Header - Mobile responsive */}
            <div className="bg-blue-900 text-white rounded-t-lg px-2 py-2 grid grid-cols-12 gap-1 font-bold">
              <div className="col-span-5 text-left pl-2">Period</div>
              <div className="col-span-2 text-center">No.</div>
              <div className="col-span-3 text-center">Big/Small</div>
              <div className="col-span-2 text-center">Color</div>
            </div>
            <div className="bg-white rounded-b-lg">
              {resultHistory.slice(0, 10).map((res, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 px-2 py-2 border-b last:border-b-0 items-center">
                  {/* Period - more space, smaller font, truncate if needed */}
                  <div className="col-span-5 text-gray-700 text-left truncate pl-2">
                    <span className="text-sm md:text-base">{res.period}</span>
                  </div>
                  
                  {/* Number - centered in its column */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`font-bold text-lg ${COLOR_CLASSES[res.color]}`}>{res.number}</span>
                  </div>
                  
                  {/* Big/Small - centered */}
                  <div className="col-span-3 text-center">
                    <span className="font-bold text-sm">{res.bigSmall}</span>
                  </div>
                  
                  {/* Color - circle only, aligned center */}
                  <div className="col-span-2 flex justify-center">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        res.color === 'green' ? 'bg-green-500' :
                        res.color === 'red' ? 'bg-red-500' :
                        'bg-purple-500'
                      } border border-gray-300`}
                      title={COLOR_LABELS[res.color]}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // My Bets Table (API)
          <div className="w-full">
            {betsLoading ? (
              <div className="text-center text-blue-200 py-8">Loading your bets...</div>
            ) : betsError ? (
              <div className="text-center text-red-400 py-8">{betsError}</div>
            ) : apiBets.length === 0 ? (
              <div className="text-center text-blue-200 py-8">
                <div className="text-4xl mb-2">🎲</div>
                <div>No bets found</div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Show newest bets at the top */}
                {[...apiBets].map((bet, idx) => {
                  // Map API fields to display fields
                  const period = bet.period;
                  const prediction = bet.prediction;
                  const amount = bet.stake;
                  const status = bet.status;
                  const profit = bet.profit;

                  // Determine color/number/bigSmall for display
                  let displayType = '';
                  let displayValue = '';
                  let colorClass = '';
                  if (
                    ["green", "red", "violet"].includes(prediction)
                  ) {
                    displayType = "color";
                    displayValue = prediction.charAt(0).toUpperCase();
                    colorClass =
                      prediction === "green"
                        ? "bg-green-500"
                        : prediction === "red"
                        ? "bg-red-500"
                        : "bg-purple-500";
                  } else if (
                    ["small", "big"].includes(prediction)
                  ) {
                    displayType = "bigSmall";
                    displayValue = prediction === "big" ? "B" : "S";
                    colorClass =
                      prediction === "big"
                        ? "bg-blue-500"
                        : "bg-orange-500";
                  } else {
                    // number prediction: "zero", "one", ..., "nine"
                    displayType = "number";
                    const numWords = [
                      "zero",
                      "one",
                      "two",
                      "three",
                      "four",
                      "five",
                      "six",
                      "seven",
                      "eight",
                      "nine",
                    ];
                    const numIdx = numWords.indexOf(prediction);
                    displayValue = numIdx !== -1 ? numIdx : "?";
                    colorClass =
                      numIdx !== -1
                        ? NUMBER_COLORS[numIdx] === "green"
                          ? "bg-green-500"
                          : NUMBER_COLORS[numIdx] === "red"
                          ? "bg-red-500"
                          : "bg-purple-500"
                        : "bg-gray-500";
                  }

                  // Find result for this bet
                  const res = resultHistory.find((r) => r.period === period);
                  let win = false;
                  if (res && status === "settled") {
                    if (
                      (displayType === "color" && prediction === res.color) ||
                      (displayType === "number" &&
                        displayValue !== "?" &&
                        Number(displayValue) === res.number) ||
                      (displayType === "bigSmall" &&
                        prediction === res.bigSmall.toLowerCase())
                    ) {
                      win = profit > 0;
                    }
                  }

                  // Use placed_at for date/time display
                  const placedAt = bet.placed_at;
                  const dateObj = placedAt ? new Date(placedAt) : null;
                  const dateStr = dateObj
                    ? dateObj.toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).replace(/\//g, "-")
                    : "";
                  const timeStr = dateObj
                    ? dateObj.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "";

                  return (
                    <div key={idx} className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        {/* Left side - Color/Number/BigSmall indicator */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg ${colorClass}`}
                          >
                            {displayValue}
                          </div>
                          <div className="text-white">
                            <div className="font-bold text-lg">{period}</div>
                            <div className="text-blue-200 text-sm">
                              {dateStr} {timeStr}
                            </div>
                          </div>
                        </div>
                        {/* Right side - Status and Amount */}
                        <div className="flex items-center gap-4">
                          {/* Status */}
                          <div className="text-center">
                            {status === "settled" ? (
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  win
                                    ? "bg-green-500 text-white"
                                    : "bg-red-500 text-white"
                                }`}
                              >
                                {win ? "Win" : "Fail"}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-500 text-white">
                                Pending
                              </span>
                            )}
                          </div>
                          {/* Amount */}
                          <div className="text-right">
                            <div
                              className={`font-bold text-lg ${
                                status === "settled"
                                  ? win
                                    ? "text-green-400"
                                    : "text-red-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {status === "settled"
                                ? win
                                  ? `+${profit}`
                                  : `-${amount}`
                                : `-${amount}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GameBoard;