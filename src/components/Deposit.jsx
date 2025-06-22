import React from 'react';

const Deposit = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded border-2 border-white shadow transition-all"
    style={{ minWidth: 120 }}
  >
    {/* Piggy bank SVG */}
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
      <path d="M19 13a7 7 0 11-14 0 7 7 0 0114 0z" />
      <path d="M17 13v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2" />
      <circle cx="12" cy="13" r="1" fill="white" />
    </svg>
    DEPOSIT
  </button>
);

export default Deposit;
