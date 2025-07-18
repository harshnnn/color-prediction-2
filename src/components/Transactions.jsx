import React, { useEffect, useState, useCallback } from 'react';
import Navbar from './Navbar';
import apiClient from '../api/apiClient'; // Import the apiClient

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    setTransactions([]);
    try {
      // Use apiClient instead of fetch. No need to manage tokens here.
      const res = await apiClient('/transactions', {
        method: 'GET',
      });

      if (!res.ok) {
        // apiClient handles 401, this is for other server errors
        throw new Error('Failed to fetch transactions.');
      }

      const data = await res.json();
      // The response might be nested, handle it safely
      const txns = Array.isArray(data) ? data : (Array.isArray(data.transactions) ? data.transactions : []);
      setTransactions(txns);

    } catch (err) {
      // Handle errors, including potential session expiry from apiClient
      setTransactionsError(err.message || 'An error occurred. Your session may have expired.');
    } finally {
      setTransactionsLoading(false);
    }
  }, []); // No dependencies needed as apiClient is stable

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4 text-center">Transaction History</h1>
        {transactionsLoading ? (
          <div className="text-blue-200 py-4 text-center animate-pulse">Loading transactions...</div>
        ) : transactionsError ? (
          <div className="text-red-300 py-4 text-center">{transactionsError}</div>
        ) : transactions.length === 0 ? (
          <div className="text-blue-200 py-4 text-center">No transactions found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...transactions].reverse().map((txn, idx) => {
              // Determine amount sign
              const amountStr = txn.debit ? `-${txn.amount}` : `+${txn.amount}`;
              const amountColor = txn.debit ? 'text-red-400' : 'text-green-400';

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
              const dateStr = txn.created_at ? new Date(txn.created_at).toLocaleString() : '';

              return (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-4 shadow-md flex flex-col justify-between h-full hover:scale-105 transition-transform duration-300"
                >
                  <div>
                    <div className="font-medium px-2 py-1 rounded bg-gray-700 text-gray-200 inline-block mb-2 text-sm">
                      {remarkLabel}
                    </div>
                    <div className="text-blue-200 text-xs mb-2">{dateStr}</div>
                  </div>
                  <div className={`font-semibold text-lg ${amountColor} text-right`}>{amountStr}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
