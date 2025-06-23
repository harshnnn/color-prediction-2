import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

export default function WithdrawalPage() {
  const [amount, setAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [withdrawalHistoryLoading, setWithdrawalHistoryLoading] = useState(false);
  const [withdrawalHistoryError, setWithdrawalHistoryError] = useState(null);

  const navigate = useNavigate();

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
        return null;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
  }, []);

  // Helper to get a valid access token, refresh if needed
  const getValidAccessToken = useCallback(async () => {
    let accessToken = localStorage.getItem('access_token');
    if (accessToken && !isTokenExpired(accessToken)) {
      return accessToken;
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) return refreshed;
    return null;
  }, [tryRefreshToken]);

  // Fetch withdrawal history from API on mount
  useEffect(() => {
    const fetchWithdrawalHistory = async () => {
      setWithdrawalHistoryLoading(true);
      setWithdrawalHistoryError(null);
      try {
        const token = await getValidAccessToken();
        if (!token) {
          setWithdrawalHistoryError('Not authenticated');
          setWithdrawalHistoryLoading(false);
          return;
        }
        const res = await fetch('https://color-prediction-742i.onrender.com/withdrawls', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setWithdrawalHistoryError('Failed to fetch withdrawal history');
          setWithdrawalHistoryLoading(false);
          return;
        }
        const data = await res.json();
        setWithdrawalHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setWithdrawalHistoryError('Failed to fetch withdrawal history');
      } finally {
        setWithdrawalHistoryLoading(false);
      }
    };
    fetchWithdrawalHistory();
  }, [getValidAccessToken]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2f6]">
      <ToastContainer />
      <Navbar />
      {/* Main Body */}
      <div className="flex flex-1 w-full mx-auto mt-4 gap-8 px-16 overflow-auto">
        {/* Left: Withdrawal Form */}
        <div className="flex-1">
          <div className="bg-white/90 rounded-xl shadow p-6 mb-6">
            <div className="mb-4">
              <label className="block text-gray-800 font-semibold mb-2 text-lg">Amount</label>
              <div className="flex">
                <input
                  type="number"
                  className="flex-1 px-4 py-3 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <button
                  className="bg-[#1a237e] text-white font-bold px-6 rounded-r transition hover:bg-blue-900"
                >
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
          {/* Add withdrawal rules/info here if needed */}
        </div>
        {/* Right: Withdrawal History */}
        <div className="w-1/3 flex flex-col">
          <div className="bg-white rounded-xl shadow p-4 flex-1 overflow-auto">
            <div className="font-bold text-blue-900 mb-3">Withdrawal History</div>
            <div className="overflow-x-auto">
              {withdrawalHistoryLoading ? (
                <div className="text-center text-blue-700 py-8">Loading...</div>
              ) : withdrawalHistoryError ? (
                <div className="text-center text-red-500 py-8">{withdrawalHistoryError}</div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a237e] text-white">
                      <th className="px-2 py-2 font-semibold">TRANSACTION NO</th>
                      <th className="px-2 py-2 font-semibold">AMOUNT</th>
                      <th className="px-2 py-2 font-semibold">STATUS</th>
                      <th className="px-2 py-2 font-semibold">DATE</th>
                      <th className="px-2 py-2 font-semibold">REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-400">No withdrawal history found.</td>
                      </tr>
                    ) : (
                      withdrawalHistory.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="px-2 py-2">{row.transaction_no || row.transactionNo || '-'}</td>
                          <td className="px-2 py-2">{(row.amount ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              row.status === "APPROVED" || row.status === "approved"
                                ? "bg-green-100 text-green-700 border border-green-400"
                                : row.status === "PENDING" || row.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-400"
                                : "bg-red-100 text-red-700 border border-red-400"
                            }`}>
                              {row.status ? row.status.toUpperCase() : '-'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : row.date || '-'}
                          </td>
                          <td className="px-2 py-2">{row.reason || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
