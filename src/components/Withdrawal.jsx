import React from 'react';

const Withdrawal = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 rounded border-2 border-white shadow transition-all"
    style={{ minWidth: 140 }}
  >
    {/* Withdrawal SVG */}
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
      <path d="M3 17l6-6 4 4 8-8" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M21 21H3v-2" stroke="white" strokeWidth="2" fill="none"/>
    </svg>
    WITHDRAWAL
  </button>
);

export default Withdrawal;
