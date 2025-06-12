import React from 'react';

function Timer({ timeLeft, renderTime }) {
  return <span>{renderTime ? renderTime(timeLeft) : `${timeLeft}s`}</span>;
}

export default Timer;