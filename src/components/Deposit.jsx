import React from 'react';

const Deposit = ({ onClick }) => (
  <button
    onClick={onClick}
    className="text-center text-white px-1 py-1 uppercase  flex items-center justify-center rounded border border-white m-1 no-underline"
    style={{ fontSize: '12px', fontWeight: '900', padding: '5px', margin: '0 5px', background: 'linear-gradient(180deg, #007b15, #138e00)' }}
  >
    <img src="/buttons/deposit-icon.webp" alt="Deposit Icon" className="w-5 h-5" style={{ filter: 'invert(1)' ,marginRight: '5px', width: '25px' }} />
    <span>DEPOSIT</span>
  </button>
);

export default Deposit;
