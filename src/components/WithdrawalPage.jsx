import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

export default function WithdrawalPage() {
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex flex-col min-h-screen bg-gradient-to-b from-[#111827] to-[#1f2937]">
      {/* Nav Bar */}
        <Navbar/>     
      {/* Main Body */}
      <div className="flex flex-1 w-full max-w-6xl mx-auto mt-8 gap-8 px-4">
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
        <div className="w-[420px]">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="font-bold text-blue-900 mb-3">Withdrawal History</div>
            {/* Add withdrawal history table here */}
            <div className="text-gray-500 text-sm">No withdrawal history yet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
