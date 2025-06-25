import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { MdDeleteOutline } from "react-icons/md";
import ifscBankMappingRaw from './ifsc_bank_mapping.json'; // Adjust path if needed

// Convert mapping array to object for fast lookup
const ifscBankMapping = {};
ifscBankMappingRaw.forEach(item => {
  if (item.IFSC_Prefix && item.Bank_Name) {
    ifscBankMapping[item.IFSC_Prefix.toUpperCase()] = item.Bank_Name;
  }
});

// Withdrawal rules
const withdrawalRules = [
  "This form is for withdrawing the amount from the main wallet only.",
  "The bonus wallet amount cannot be withdrawn by this form.",
  "Do not put Withdraw request without betting with deposit amount. Such activity may be identified as Suspicious.",
  "If multiple users are using same withdraw account then all the linked users will be blocked.",
  "Maximum Withdraw time is 45 minutes then only complain on WhatsApp number."
];

export default function WithdrawalPage() {
  const [amount, setAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [withdrawalHistoryLoading, setWithdrawalHistoryLoading] = useState(false);
  const [withdrawalHistoryError, setWithdrawalHistoryError] = useState(null);

  // Account management
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState(null);

  // Add account modal
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccountType, setAddAccountType] = useState('');
  const [addAccountName, setAddAccountName] = useState('');
  const [addAccountNumber, setAddAccountNumber] = useState('');
  const [addIfsc, setAddIfsc] = useState('');
  const [addWithdrawPassword, setAddWithdrawPassword] = useState('');
  const [addAccountLoading, setAddAccountLoading] = useState(false);

  // Track if user has set withdrawal password (only ask on first account)
  const [hasWithdrawPassword, setHasWithdrawPassword] = useState(false);

  // Withdraw functionality
  const [withdrawInputs, setWithdrawInputs] = useState({}); // { [accountId]: { amount: '', error: '' } }
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawAccount, setWithdrawAccount] = useState(null);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [userBalance, setUserBalance] = useState(null);

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

  // Fetch user withdrawal accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const token = await getValidAccessToken();
        if (!token) {
          setAccountsError('Not authenticated');
          setAccountsLoading(false);
          return;
        }
        // Replace with your actual endpoint for fetching user withdrawal accounts
        const res = await fetch('https://color-prediction-742i.onrender.com/accounts', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setAccountsError('Failed to fetch accounts');
          setAccountsLoading(false);
          return;
        }
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
        setHasWithdrawPassword(data && data.length > 0 && !!data[0].has_withdraw_password);
      } catch (err) {
        setAccountsError('Failed to fetch accounts');
      } finally {
        setAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, [getValidAccessToken, showAddAccount]);

  // Fetch user balance
  const fetchUserBalance = useCallback(async () => {
    try {
      const token = await getValidAccessToken();
      if (!token) return;
      const res = await fetch('https://color-prediction-742i.onrender.com/users/', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUserBalance(data.wallet?.balance ?? null);
    } catch {}
  }, [getValidAccessToken]);

  useEffect(() => {
    fetchUserBalance();
  }, [fetchUserBalance]);

  // Helper to get bank name from IFSC
  function getBankNameWithIfsc(ifsc) {
    if (!ifsc) return '';
    const prefix = ifsc.slice(0, 4).toUpperCase();
    const bankName = ifscBankMapping[prefix] || '';
    return bankName ? `${bankName} (${ifsc})` : ifsc;
  }

  // Add account handler
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!addAccountType) {
      toast.error('Please select account type');
      return;
    }
    if (!addAccountName || !addAccountNumber || !addIfsc) {
      toast.error('Please fill all fields');
      return;
    }
    if (!hasWithdrawPassword && !addWithdrawPassword) {
      toast.error('Please set a withdraw password');
      return;
    }
    setAddAccountLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        toast.error('Not authenticated');
        setAddAccountLoading(false);
        return;
      }
      // Replace with your actual endpoint for adding withdrawal account
      const res = await fetch('https://color-prediction-742i.onrender.com/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_holder_name: addAccountName,
          bank_account_number: addAccountNumber,
          ifsc_code: addIfsc,
          withdraw_password: !hasWithdrawPassword ? addWithdrawPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || data.detail || 'Failed to add account');
        setAddAccountLoading(false);
        return;
      }
      toast.success('Account added successfully!');
      setShowAddAccount(false);
      setAddAccountType('');
      setAddAccountName('');
      setAddAccountNumber('');
      setAddIfsc('');
      setAddWithdrawPassword('');
    } catch (err) {
      toast.error('Failed to add account');
    } finally {
      setAddAccountLoading(false);
    }
  };

  // Withdraw button handler (per account)
  const handleWithdrawClick = (acc) => {
    const input = withdrawInputs[acc.id] || { amount: '' };
    let error = '';
    if (!input.amount || isNaN(Number(input.amount))) {
      error = 'Please enter a valid amount';
    } else if (Number(input.amount) < 100) {
      error = 'Minimum amount is ₹100';
    } else if (Number(input.amount) > 50000) {
      error = 'Maximum amount is ₹50,000';
    }
    setWithdrawInputs((prev) => ({
      ...prev,
      [acc.id]: { ...input, error }
    }));
    if (error) return;
    setWithdrawAccount(acc);
    setShowWithdrawConfirm(true);
  };

  // Move fetchWithdrawalHistory out of useEffect so you can call it after withdrawal
  const fetchWithdrawalHistory = useCallback(async () => {
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
  }, [getValidAccessToken]);

  // And update your useEffect to use this function:
  useEffect(() => {
    fetchWithdrawalHistory();
  }, [fetchWithdrawalHistory]);

  // UI
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2f6]">
      <ToastContainer />
      <Navbar />
      {/* Add Account Button */}
      <div className="flex justify-center mt-4 mb-2">
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-full shadow transition-all"
          onClick={() => setShowAddAccount(true)}
        >
          ADD ACCOUNT
        </button>
      </div>
      {/* Main Sections */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-8 px-2 sm:px-4 md:px-8 lg:px-16 w-full">
        {/* Left: Rules */}
        <div className="flex-1 bg-white rounded-xl shadow p-4 mb-4">
          <ol className="list-decimal pl-6 space-y-2 text-sm text-red-600">
            {withdrawalRules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ol>
        </div>
        {/* Right: Withdrawal History */}
        <div className="w-full lg:w-1/3 flex flex-col">
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
                      <th className="px-2 py-2 font-semibold">AMOUNT</th>
                      <th className="px-2 py-2 font-semibold">STATUS</th>
                      <th className="px-2 py-2 font-semibold">ACCOUNT</th>
                      <th className="px-2 py-2 font-semibold">DATE</th>
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
                          <td className="px-2 py-2">{row.bank_account || '-'}</td>
                          <td className="px-2 py-2">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : row.date || '-'}
                          </td>
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
      {/* WhatsApp Help Bar */}
      <div className="w-full flex justify-center mt-6 mb-2">
        <div className="w-full max-w-3xl bg-[#1a3ea7] text-white rounded-xl shadow-lg py-3 px-4 text-center font-bold text-sm flex flex-col items-center">
          FOR WITHDRAW PASSWORD RELATED ISSUES CLICK HERE
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 text-white"
          >
            <span className="text-2xl"> <i className="fa fa-whatsapp"></i> </span>
            WhatsApp
          </a>
        </div>
      </div>
      {/* User Accounts for Withdrawal */}
      <div className="w-full flex items-center px-10 mt-4">
        {accountsLoading ? (
          <div className="text-center text-blue-700 py-8">Loading accounts...</div>
        ) : accountsError ? (
          <div className="text-center text-red-500 py-8">{accountsError}</div>
        ) : accounts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No withdrawal accounts added yet.</div>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 mb-6 relative">
              {/* Delete button */}
              <button
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 flex items-center justify-center"
                title="Delete Account"
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to delete this account?')) return;
                  try {
                    const token = await getValidAccessToken();
                    if (!token) {
                      toast.error('Not authenticated');
                      return;
                    }
                    const res = await fetch(
                      `https://color-prediction-742i.onrender.com/accounts/${acc.id}`,
                      {
                        method: 'DELETE',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );
                    if (!res.ok) {
                      const data = await res.json();
                      toast.error(data.message || data.detail || 'Failed to delete account');
                      return;
                    }
                    toast.success('Account deleted successfully!');
                    setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
                  } catch {
                    toast.error('Failed to delete account');
                  }
                }}
              >
                <MdDeleteOutline />
              </button>
              <div className="text-center font-bold text-lg mb-2">{acc.account_holder_name}</div>
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span>Account No :</span>
                  <span className="font-semibold">{acc.bank_account_number}</span>
                  <button className="ml-2" onClick={() => navigator.clipboard.writeText(acc.bank_account_number)}>
                    <i className="fa fa-copy text-blue-700"></i>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>IFSC Code :</span>
                  <span className="font-semibold">{acc.ifsc_code}</span>
                  <button className="ml-2" onClick={() => navigator.clipboard.writeText(acc.ifsc_code)}>
                    <i className="fa fa-copy text-blue-700"></i>
                  </button>
                </div>
              </div>
              {/* Withdraw input and button */}
              <form
                className="flex flex-col gap-3"
                onSubmit={e => {
                  e.preventDefault();
                  handleWithdrawClick(acc);
                }}
              >
                <input
                  type="number"
                  min={100}
                  max={50000}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={withdrawInputs[acc.id]?.amount || ''}
                  onChange={e =>
                    setWithdrawInputs((prev) => ({
                      ...prev,
                      [acc.id]: {
                        amount: e.target.value,
                        error: ''
                      }
                    }))
                  }
                />
                {withdrawInputs[acc.id]?.error && (
                  <div className="text-red-600 text-sm">{withdrawInputs[acc.id].error}</div>
                )}
                <button
                  type="submit"
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded transition-all text-lg"
                >
                  WITHDRAW
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {/* Withdraw Confirm Modal */}
      {showWithdrawConfirm && withdrawAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div
            className="w-full max-w-md mx-2 p-0 overflow-hidden rounded-xl"
            style={{
              background: "#181818",
              border: "1.5px solid #ffb800",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)"
            }}
          >
            <div className="px-6 py-6">
              <div className="text-[#ffb800] text-2xl font-bold mb-4">Withdraw Confirmation</div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-lg">Balance</span>
                <span className="text-[#ffb800] font-bold text-lg">
                  ₹ {userBalance !== null ? userBalance : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-lg">Bank</span>
                <span className="text-[#ffb800] font-bold text-lg text-right">
                  {getBankNameWithIfsc(withdrawAccount.ifsc_code)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-lg">Account No</span>
                <span className="text-[#ffb800] font-bold text-lg">
                  {withdrawAccount.bank_account_number}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-lg">Amount</span>
                <span className="text-[#ffb800] font-bold text-lg">
                  ₹ {withdrawInputs[withdrawAccount.id]?.amount}
                </span>
              </div>
              <div className="mb-4 mt-6">
                <label className="block text-white mb-2 font-semibold text-lg">Verify Withdrawal Password</label>
                <input
                  type="password"
                  value={withdrawPassword}
                  onChange={e => setWithdrawPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-[#222] border border-[#ffb800] text-[#ffb800] focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-[#bfa94a] text-lg"
                  placeholder="Enter withdrawal password"
                />
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  className="flex-1 bg-[#3a4252] hover:bg-[#232733] text-white py-3 rounded font-semibold text-lg transition"
                  onClick={() => setShowWithdrawConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-[#ffb800] hover:bg-[#ffd700] text-black py-3 rounded font-bold text-lg transition"
                  onClick={async () => {
                    // Use the correct amount for this account
                    const withdrawAmount = withdrawInputs[withdrawAccount.id]?.amount;
                    if (!withdrawAccount || !withdrawAmount || !withdrawPassword) {
                      toast.error('Please fill all fields');
                      return;
                    }
                    try {
                      const token = await getValidAccessToken();
                      if (!token) {
                        toast.error('Not authenticated');
                        return;
                      }
                      const res = await fetch('https://color-prediction-742i.onrender.com/withdrawls', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          bank_account: String(withdrawAccount.bank_account_number),
                          ifsc_code: withdrawAccount.ifsc_code,
                          amount: Number(withdrawAmount),
                          withdraw_password: withdrawPassword,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        toast.error(data.message || data.detail || 'Withdrawal failed');
                        return;
                      }
                      toast.success(data.message || 'Withdrawal request submitted!');
                      setShowWithdrawConfirm(false);
                      setWithdrawPassword('');
                      setWithdrawInputs((prev) => ({
                        ...prev,
                        [withdrawAccount.id]: { amount: '', error: '' }
                      }));
                      fetchWithdrawalHistory();
                    } catch (err) {
                      toast.error('Withdrawal failed');
                    }
                  }}
                >
                  Confirm withdrawal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-2 p-0 overflow-hidden">
            <div className="bg-[#1a3ea7] text-white text-lg font-bold px-6 py-4 flex justify-between items-center">
              <span>Add account</span>
              <button onClick={() => setShowAddAccount(false)} className="text-2xl font-bold hover:text-blue-200">×</button>
            </div>
            <form onSubmit={handleAddAccount} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1">ACCOUNT TYPE</label>
                <select
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  value={addAccountType}
                  onChange={e => setAddAccountType(e.target.value)}
                  required
                >
                  <option value="">---Select Account Type---</option>
                  <option value="bank">Bank Account</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">A/C HOLDER NAME</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  placeholder="Enter Name"
                  value={addAccountName}
                  onChange={e => setAddAccountName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">A/C NUMBER</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  placeholder="Enter A/C Number"
                  value={addAccountNumber}
                  onChange={e => setAddAccountNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">IFSC CODE</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  placeholder="Enter IFSC CODE"
                  value={addIfsc}
                  onChange={e => setAddIfsc(e.target.value)}
                  required
                />
              </div>
              {!hasWithdrawPassword && (
                <div>
                  <label className="block font-semibold mb-1">WITHDRAW PASSWORD</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 rounded border border-gray-300"
                    placeholder="Enter Withdraw password"
                    value={addWithdrawPassword}
                    onChange={e => setAddWithdrawPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
                  onClick={() => setShowAddAccount(false)}
                  disabled={addAccountLoading}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded"
                  disabled={addAccountLoading}
                >
                  {addAccountLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
