import React, { useState } from 'react';
import ColorButton from './ColorButton';

function BetPanel() {
  const [selectedColor, setSelectedColor] = useState(null);
  const [betAmount, setBetAmount] = useState(0);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const handleBetChange = (event) => {
    setBetAmount(event.target.value);
  };

  const handlePlaceBet = () => {
    if (selectedColor && betAmount > 0) {
      alert(`Bet placed on ${selectedColor} for $${betAmount}`);
      // Logic to handle the bet can be added here
    } else {
      alert('Please select a color and enter a bet amount.');
    }
  };

  return (
    <div className="bet-panel">
      <h2>Place Your Bet</h2>
      <div className="color-buttons">
        <ColorButton color="red" onSelect={handleColorSelect} />
        <ColorButton color="green" onSelect={handleColorSelect} />
        <ColorButton color="purple" onSelect={handleColorSelect} />
      </div>
      <input
        type="number"
        value={betAmount}
        onChange={handleBetChange}
        placeholder="Enter bet amount"
      />
      <button onClick={handlePlaceBet}>Place Bet</button>
      {selectedColor && <p>Your selected color: {selectedColor}</p>}
    </div>
  );
}

export default BetPanel;