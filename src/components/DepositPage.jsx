import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const depositRules = [
  "Deposit money only in the below available accounts to get the fastest credits and avoid possible delays.",
  "Deposits made 45 minutes after the account removal from the site are valid & will be added to their wallets.",
  "Site is not responsible for money deposited to Old, Inactive or Closed accounts.",
  "After deposit, add your UTR and amount to receive balance.",
  "NEFT receiving time varies from 40 minutes to 2 hours.",
  "In case of account modification: payment valid for 1 hour after changing account details in deposit page."
];

export default function DepositPage() {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('amount');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [utr, setUtr] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const api = import.meta.env.VITE_API_BASE_URL;

  // Deposit methods from API
  const [depositMethods, setDepositMethods] = useState([]);
  const [depositMethodsLoading, setDepositMethodsLoading] = useState(false);
  const [depositMethodsError, setDepositMethodsError] = useState(null);

  // New state for deposit history from API
  const [depositHistory, setDepositHistory] = useState([]);
  const [depositHistoryLoading, setDepositHistoryLoading] = useState(false);
  const [depositHistoryError, setDepositHistoryError] = useState(null);

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
      const res = await fetch(`${api}/auth/refresh`, {
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

  // Fetch deposit methods from API on mount
  useEffect(() => {
    const fetchDepositMethods = async () => {
      setDepositMethodsLoading(true);
      setDepositMethodsError(null);
      try {
        const token = await getValidAccessToken();
        if (!token) {
          setDepositMethodsError('Not authenticated');
          setDepositMethodsLoading(false);
          return;
        }
        const res = await fetch(`${api}/admin/deposit-method`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setDepositMethodsError('Failed to fetch deposit methods');
          setDepositMethodsLoading(false);
          return;
        }
        const data = await res.json();
        // Map API methods to UI format (support both old and new API shapes)
        const mapped = (Array.isArray(data) ? data : []).map((method) => {
          // If new format (bank_name, bank_account_number, etc)
          if (method.bank_name && method.bank_account_number) {
            return {
              key: method.id?.toString() || Math.random().toString(),
              label: 'ACCOUNT',
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path d="M12 3L2 9l10 6 10-6-10-6z" fill="#1976d2"/>
                  <rect x="4" y="13" width="16" height="7" fill="#1976d2"/>
                  <rect x="7" y="16" width="2" height="4" fill="#fff"/>
                  <rect x="11" y="16" width="2" height="4" fill="#fff"/>
                  <rect x="15" y="16" width="2" height="4" fill="#fff"/>
                </svg>
              ),
              details: {
                bankName: method.bank_name,
                accountNo: method.bank_account_number,
                ifsc: method.ifsc_code,
                accountHolder: method.account_holder_name,
                minAmount: method.min,
                maxAmount: method.max,
              },
              type: 'bank',
            };
          }
          // Default: bank
          let icon = (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path d="M12 3L2 9l10 6 10-6-10-6z" fill="#1976d2"/>
              <rect x="4" y="13" width="16" height="7" fill="#1976d2"/>
              <rect x="7" y="16" width="2" height="4" fill="#fff"/>
              <rect x="11" y="16" width="2" height="4" fill="#fff"/>
              <rect x="15" y="16" width="2" height="4" fill="#fff"/>
            </svg>
          );
          let label = method.type?.toUpperCase() || 'ACCOUNT';
          if (method.type === 'whatsapp') {
            icon = (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                alt="WhatsApp"
                className="h-6 w-6"
              />
            );
            label = 'WHATSAPP DEPOSIT';
          } else if (method.type === 'paytm') {
            icon = (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Paytm_logo.png"
                alt="Paytm"
                className="h-6 w-12 object-contain"
              />
            );
            label = 'PAYTM';
          } else if (method.type === 'usdt') {
            icon = (
              <img
                src="https://cryptologos.cc/logos/tether-usdt-logo.png"
                alt="USDT"
                className="h-6 w-6 object-contain"
              />
            );
            label = 'USDT';
          }
          // Map details
          let details = {};
          if (method.type === 'paytm') {
            details = {
              paytmNo: method.paytm_no,
              accountHolder: method.account_holder,
              minAmount: method.min_amount,
              maxAmount: method.max_amount,
            };
          } else if (method.type === 'usdt') {
            details = {
              usdtAddress: method.usdt_address,
              minAmount: method.min_amount,
              maxAmount: method.max_amount,
            };
          } else if (method.type === 'whatsapp') {
            details = {
              whatsapp: method.whatsapp_no,
              note: method.note,
            };
          } else {
            details = {
              bankName: method.bank_name,
              accountNo: method.account_no,
              ifsc: method.ifsc_code,
              accountHolder: method.account_holder,
              minAmount: method.min_amount,
              maxAmount: method.max_amount,
            };
          }
          return {
            key: method.id?.toString() || method.type || Math.random().toString(),
            label,
            icon,
            details,
            type: method.type,
          };
        });
        setDepositMethods(mapped);
      } catch (err) {
        setDepositMethodsError('Failed to fetch deposit methods');
      } finally {
        setDepositMethodsLoading(false);
      }
    };
    fetchDepositMethods();
  }, [getValidAccessToken]);

  // Fetch deposit history from API
  const fetchDepositHistory = useCallback(async () => {
    setDepositHistoryLoading(true);
    setDepositHistoryError(null);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setDepositHistoryError('Not authenticated');
        setDepositHistoryLoading(false);
        return;
      }
      const res = await fetch(`${api}/deposits`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setDepositHistoryError('Failed to fetch deposit history');
        setDepositHistoryLoading(false);
        return;
      }
      const data = await res.json();
      setDepositHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setDepositHistoryError('Failed to fetch deposit history');
    } finally {
      setDepositHistoryLoading(false);
    }
  }, [getValidAccessToken]);

  // Fetch deposit history on mount and when fetchDepositHistory changes
  useEffect(() => {
    fetchDepositHistory();
  }, [fetchDepositHistory]);

  // Handle submit for amount
  const handleAmountSubmit = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (isNaN(amt) || amt < 300) {
      toast.error('Amount should be at least 300', { position: "top-center" });
      return;
    }
    setStep('method');
    setSelectedMethod(depositMethods[0]); // Select first method by default
  };

  // Handle method selection
  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setPaymentProof(e.target.files[0]);
  };

  // Handle deposit final submit (UTR, proof, etc)
  const handleDepositFinalSubmit = async (e) => {
    e.preventDefault();
    if (!utr || utr.length < 6 || utr.length > 12) {
      toast.error('Enter a valid 6 to 12 digit UTR number', { position: "top-center" });
      return;
    }
    if (!amount || Number(amount) < 300) {
      toast.error('Amount should be at least 300', { position: "top-center" });
      return;
    }
    if (!selectedMethod || !selectedMethod.key) {
      toast.error('Please select a deposit method', { position: "top-center" });
      return;
    }
    if (!paymentProof) {
      toast.error('Please upload payment proof image', { position: "top-center" });
      return;
    }
    if (selectedMethod.type !== 'bank') {
      toast.error('Only bank deposit is supported for now', { position: "top-center" });
      return;
    }
    try {
      const token = await getValidAccessToken();
      if (!token) {
        toast.error('Not authenticated', { position: "top-center" });
        return;
      }
      const formData = new FormData();
      formData.append('account_id', selectedMethod.key);
      formData.append('amount', Number(amount));
      formData.append('utr', utr);
      formData.append('image', paymentProof);

      const res = await fetch(`${api}/deposits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || data.detail || 'Deposit failed', { position: "top-center" });
        return;
      }
      toast.success('Deposit request submitted!', { position: "top-center" });
      setUtr('');
      setPaymentProof(null);
      setStep('amount');
      setAmount('');
      fetchDepositHistory();
    } catch (err) {
      toast.error('Deposit failed. Please try again.', { position: "top-center" });
    }
  };

  // Back button logic
  const handleBack = () => {
    if (step === 'method') {
      setStep('amount');
      setUtr('');
      setPaymentProof(null);
      // Keep amount and selectedMethod for user convenience
    } else {
      navigate('/');
    }
  };

  // Render method selection buttons (styled as in the image)
  const renderMethodButtons = () => (
    <div className="flex flex-wrap gap-2 mb-6 w-full justify-center">
      {depositMethods.map((method) => (
        <button
          key={method.key}
          className={`flex flex-row items-center justify-center gap-1 px-2 py-2 rounded-xl border-2 font-bold transition-all min-w-[110px] text-xs
            ${selectedMethod && selectedMethod.key === method.key
              ? 'bg-white border-blue-900 text-blue-900 shadow'
              : 'bg-[#f7f7fa] border-blue-200 text-blue-900 hover:bg-blue-50'}
            `}
          style={{
            boxShadow: selectedMethod && selectedMethod.key === method.key ? '0 2px 8px #b3c6ff33' : undefined,
            outline: selectedMethod && selectedMethod.key === method.key ? '2px solid #1a237e' : undefined
          }}
          onClick={() => handleMethodSelect(method)}
          type="button"
        >
          {method.icon}
          <span>{method.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2f6]">
      <ToastContainer />
      <Navbar />
      {/* Back Button */}
      <div className="flex w-full mx-auto mt-2 px-2 sm:px-4 md:px-8 lg:px-16">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded shadow text-blue-900 font-bold border border-blue-200 hover:bg-blue-50"
        >
          <span className="text-lg">&#8592;</span>
          <span>BACK</span>
        </button>
      </div>
      <div className="flex flex-1 w-full mx-auto mt-4 gap-4 md:gap-8 px-2 sm:px-4 md:px-8 lg:px-16 overflow-auto flex-col lg:flex-row">
        {/* Left: Deposit Methods, Form, Rules */}
        <div className="flex-1 flex flex-col w-full lg:w-2/3 min-w-0">
          {/* Step 1: Amount input */}
          {step === 'amount' && (
            <form onSubmit={handleAmountSubmit} className="bg-white/90 rounded-xl shadow p-4 sm:p-6 mb-6 w-full max-w-xl mx-auto">
              <div className="mb-4">
                <label className="block text-gray-800 font-semibold mb-2 text-lg">Amount</label>
                <div className="flex">
                  <input
                    type="number"
                    className="flex-1 px-4 py-3 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min={300}
                  />
                  <button
                    type="submit"
                    className="bg-[#1a237e] text-white font-bold px-6 rounded-r transition hover:bg-blue-900"
                  >
                    SUBMIT
                  </button>
                </div>
              </div>
            </form>
          )}
          {/* Step 2: Method selection and form */}
          {step === 'method' && (
            <>
              {depositMethodsLoading ? (
                <div className="text-center text-blue-700 py-8">Loading deposit methods...</div>
              ) : depositMethodsError ? (
                <div className="text-center text-red-500 py-8">{depositMethodsError}</div>
              ) : (
                <>
                  {renderMethodButtons()}
                  {/* Responsive: stack on mobile, row on desktop */}
                  <div className="flex flex-col lg:flex-row gap-4 md:gap-6 justify-center w-full">
                    {/* Left: Details */}
                    <div className="flex-1 max-w-full lg:max-w-[340px]">
                      <div className="bg-white rounded-xl shadow p-4 mb-4">
                        <div className="font-bold text-blue-900 text-lg mb-2 text-center">
                          {selectedMethod.label === 'ACCOUNT' ? 'BANK ACCOUNT' : selectedMethod.label}
                        </div>
                        <div className="divide-y divide-blue-100">
                          {/* Render for new API shape */}
                          {selectedMethod.type === 'bank' && (
                            <>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>Bank Name</span>
                                <span className="font-semibold break-all">{selectedMethod.details.bankName}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.bankName)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>A/C No</span>
                                <span className="font-semibold break-all">{selectedMethod.details.accountNo}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.accountNo)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>IFSC Code</span>
                                <span className="font-semibold break-all">{selectedMethod.details.ifsc}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.ifsc)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>Account Name</span>
                                <span className="font-semibold break-all">{selectedMethod.details.accountHolder}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.accountHolder)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Min Amount</span>
                                <span className="font-semibold">{selectedMethod.details.minAmount}</span>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Max Amount</span>
                                <span className="font-semibold">{selectedMethod.details.maxAmount}</span>
                              </div>
                            </>
                          )}
                          {selectedMethod.type === 'paytm' && (
                            <>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>Paytm No</span>
                                <span className="font-semibold break-all">{selectedMethod.details.paytmNo}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.paytmNo)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>Account Name</span>
                                <span className="font-semibold break-all">{selectedMethod.details.accountHolder}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.accountHolder)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Min Amount</span>
                                <span className="font-semibold">{selectedMethod.details.minAmount}</span>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Max Amount</span>
                                <span className="font-semibold">{selectedMethod.details.maxAmount}</span>
                              </div>
                            </>
                          )}
                          {selectedMethod.type === 'usdt' && (
                            <>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>USDT Address</span>
                                <span className="font-semibold break-all">{selectedMethod.details.usdtAddress}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.usdtAddress)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Min Amount</span>
                                <span className="font-semibold">{selectedMethod.details.minAmount}</span>
                              </div>
                              <div className="flex justify-between py-2">
                                <span>Max Amount</span>
                                <span className="font-semibold">{selectedMethod.details.maxAmount}</span>
                              </div>
                            </>
                          )}
                          {selectedMethod.type === 'whatsapp' && (
                            <>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>WhatsApp</span>
                                <span className="font-semibold break-all">{selectedMethod.details.whatsapp}</span>
                                <button className="ml-2" onClick={() => navigator.clipboard.writeText(selectedMethod.details.whatsapp)}>
                                  <i className="fa fa-copy text-blue-700"></i>
                                </button>
                              </div>
                              <div className="flex justify-between py-2 flex-wrap">
                                <span>Note</span>
                                <span className="font-semibold break-all">{selectedMethod.details.note}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Extra info for bank */}
                        {selectedMethod.type === 'bank' && (
                          <>
                            <div className="text-center mt-4">
                              <a
                                href="https://www.upitobank.info"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block font-bold text-blue-900 underline"
                              >
                                HOW TO TRANSFER UPI TO BANK<br />CLICK HERE WWW.UPITOBANK.INFO
                              </a>
                            </div>
                            <div className="mt-4">
                              <a
                                href="https://wa.me/919876543210"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-blue-900 text-white font-bold py-3 rounded-xl text-center"
                              >
                                FOR PAYMENT RELATED ISSUES CLICK HERE <i className="fa fa-whatsapp ml-2"></i>
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Right: Deposit Form */}
                    <div className="flex-1 max-w-full lg:max-w-[340px]">
                      <form
                        onSubmit={handleDepositFinalSubmit}
                        className="bg-white rounded-xl shadow p-4 sm:p-6 flex flex-col gap-4"
                        style={{ minWidth: 0 }}
                      >
                        {selectedMethod.type !== 'whatsapp' && (
                          <>
                            <div>
                              <label className="block font-semibold mb-1">
                                Unique Transaction Reference <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="6 to 12 Digit UTR Number"
                                value={utr}
                                onChange={e => setUtr(e.target.value)}
                                maxLength={12}
                                minLength={6}
                                required
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1">
                                Upload Payment Proof <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full"
                                onChange={handleFileChange}
                                required
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block font-semibold mb-1">Amount</label>
                          <div className="flex">
                            <input
                              type="number"
                              className="w-full px-4 py-2 rounded-l border border-gray-300 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={amount}
                              min={300}
                              onChange={e => setAmount(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-r transition"
                              onClick={() => setStep('amount')}
                              title="Change Amount"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        {selectedMethod.type !== 'whatsapp' && (
                          <div className="flex items-center">
                            <input type="checkbox" required className="mr-2" id="agree" />
                            <label htmlFor="agree" className="text-sm">
                              I have read and agree with the <a href="#" className="text-blue-600 underline">terms of payment and withdrawal policy</a>.
                            </label>
                          </div>
                        )}
                        <div className="w-full flex">
                          <button
                            type="submit"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded transition-all text-lg"
                            style={{ minWidth: 0 }}
                          >
                            SUBMIT
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {/* Rules - always visible, allow scroll if needed */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 flex-1 overflow-auto mt-4 max-h-[220px] md:max-h-[300px]">
            <ol className="list-decimal pl-6 space-y-2 text-sm text-red-600">
              {depositRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ol>
          </div>
        </div>
        {/* Right: Deposit History  */}
        <div className="w-full lg:w-1/3 flex flex-col mt-8 lg:mt-0">
          <div className="bg-white rounded-xl shadow p-4 flex-1 overflow-auto">
            <div className="font-bold text-blue-900 mb-3">Deposit History</div>
            <div className="overflow-x-auto">
              {depositHistoryLoading ? (
                <div className="text-center text-blue-700 py-8">Loading...</div>
              ) : depositHistoryError ? (
                <div className="text-center text-red-500 py-8">{depositHistoryError}</div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a237e] text-white">
                      <th className="px-2 py-2 font-semibold">TRANSACTION ID</th>
                      <th className="px-2 py-2 font-semibold">AMOUNT</th>
                      <th className="px-2 py-2 font-semibold">STATUS</th>
                      <th className="px-2 py-2 font-semibold">DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-400">No deposit history found.</td>
                      </tr>
                    ) : (
                      depositHistory.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="px-2 py-2">{row.transaction_id || '-'}</td>
                          <td className="px-2 py-2">{(row.amount ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              row.status === "verified"
                                ? "bg-green-100 text-green-700 border border-green-400"
                                : "bg-yellow-100 text-yellow-700 border border-yellow-400"
                            }`}>
                              {row.status ? row.status.toUpperCase() : '-'}
                            </span>
                          </td>
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
    </div>
  );
}