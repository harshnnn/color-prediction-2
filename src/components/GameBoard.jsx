import React, { useState, useCallback, useEffect, useRef } from 'react';
import Timer from './Timer';

const GAME_TYPES = [
  { label: 'Win Go 30Sec', duration: 30 },
  { label: 'Win Go 1Min', duration: 60 },
  { label: 'Win Go 3Min', duration: 180 },
  { label: 'Win Go 5Min', duration: 300 },
];

const COLOR_LABELS = {
  green: 'Green',
  violet: 'Violet',
  red: 'Red',
};

const COLOR_CLASSES = {
  green: 'text-green-500',
  violet: 'text-purple-500',
  red: 'text-red-500',
};

const NUMBER_COLORS = {
  0: 'violet',
  1: 'green',
  2: 'red',
  3: 'green',
  4: 'red',
  5: 'violet',
  6: 'red',
  7: 'green',
  8: 'red',
  9: 'green',
};

function getRandomResult() {
  const number = Math.floor(Math.random() * 10);
  let color = '';
  if ([1, 3, 7, 9].includes(number)) color = 'green';
  else if ([2, 4, 6, 8].includes(number)) color = 'red';
  else color = 'violet';
  const bigSmall = number >= 5 ? 'Big' : 'Small';
  return { number, color, bigSmall };
}

// Helper to get color and big/small from number
function getColorAndBigSmall(number) {
  let color = '';
  if (number === 0 || number === 5) color = 'violet';
  else if (number % 2 === 1) color = 'green';
  else color = 'red';
  const bigSmall = number < 5 ? 'Small' : 'Big';
  return { color, bigSmall };
}

// Parse period string as UTC date
function parsePeriodToUTCDate(period) {
  // period: "20250610111829" => 2025-06-10T11:18:29Z (Z = UTC)
  const year = period.slice(0, 4);
  const month = period.slice(4, 6);
  const day = period.slice(6, 8);
  const hour = period.slice(8, 10);
  const min = period.slice(10, 12);
  const sec = period.slice(12, 14);
  return new Date(Date.UTC(year, month - 1, day, hour, min, sec));
}

function GameBoard() {
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [selectedBigSmall, setSelectedBigSmall] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [agree, setAgree] = useState(false);
  const [balance] = useState(1000);
  const [betHistory, setBetHistory] = useState([]);
  const [period, setPeriod] = useState('');
  const [timerKey, setTimerKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef(null);
  const [pendingPeriod, setPendingPeriod] = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [nextPeriodInfo, setNextPeriodInfo] = useState(null);

  // Fetch result history and set period/timer
  useEffect(() => {
    let interval;
    const fetchHistory = async () => {
      try {
        const res = await fetch('https://color-prediction-742i.onrender.com/results');
        const data = await res.json();
        const mapped = data
          .filter(r => r.number !== -1)
          .map(r => ({
            ...r,
            ...getColorAndBigSmall(r.number)
          }));
        setResultHistory(mapped);

        // 1. Find the pending period (number === -1)
        const pending = data.find(r => r.number === -1);
        if (pending) {
          setPendingPeriod(pending.period);
          setPeriod(pending.period);

          // 2. Parse period as UTC
          const periodUTCDate = parsePeriodToUTCDate(pending.period);

          // 3. Get current UTC time
          const nowUTC = new Date();

          // 4. Calculate timeLeft in seconds
          let diff = Math.floor((periodUTCDate.getTime() - nowUTC.getTime()) / 1000);
          if (diff < 0) diff = 0;

          // 5. Set timer to this value
          setTimeLeft(diff);
        }
      } catch (e) {
        // handle error
      }
    };
    fetchHistory();
    interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // Timer logic synced to backend period (using UTC)
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (timeLeft <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [period, timeLeft]);

  // When timer hits 0, fetch result for current period
  useEffect(() => {
    if (timeLeft === 0 && pendingPeriod) {
      handleTimeUp();
    }
    // eslint-disable-next-line
  }, [timeLeft, pendingPeriod]);

  // Fetch result for pending period when timer ends
  const handleTimeUp = useCallback(async () => {
    if (!pendingPeriod) return;
    try {
      const res = await fetch(`https://color-prediction-742i.onrender.com/results/${pendingPeriod}`);
      const data = await res.json();
      const { color, bigSmall } = getColorAndBigSmall(data.number);
      const result = { ...data, color, bigSmall };

      setRoundResult(result);
      setShowResult(true);

      // Add to resultHistory if not present
      setResultHistory(prev => {
        if (prev.find(r => r.period === result.period)) return prev;
        return [{ ...result }, ...prev.slice(0, 19)];
      });

      // Add to betHistory for showing history (if any bets for this period)
      setBetHistory(prev =>
        prev.map(bet =>
          bet.period === result.period ? { ...bet, result } : bet
        )
      );

      setTimeout(() => {
        setShowResult(false);
        setTimerKey(k => k + 1);
        setShowBetModal(false);
        
      }, 3000);
    } catch (e) {
      // handle error
    }
  }, [pendingPeriod, gameType.duration]);

  // Update period to pendingPeriod when it changes
  useEffect(() => {
    if (pendingPeriod) setPeriod(pendingPeriod);
  }, [pendingPeriod]);

  const handleGameTypeChange = (type) => {
    setGameType(type);
    setShowBetModal(false);
    setSelectedColor(null);
    setSelectedNumber(null);
    setSelectedBigSmall(null); // Add this line
    setQuantity(1);
    setAgree(false);
    setShowResult(false);
    setRoundResult(null);
    setTimerKey((k) => k + 1);
    setTimeLeft(type.duration);
  };

  const handleColorClick = (color) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedColor(color);
      setSelectedNumber(null);
      setSelectedBigSmall(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleNumberClick = (num) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedNumber(num);
      setSelectedColor(null);
      setSelectedBigSmall(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleBigSmallClick = (bigSmall) => {
    if (timeLeft > 5 && !showResult) {
      setSelectedBigSmall(bigSmall);
      setSelectedColor(null);
      setSelectedNumber(null);
      setShowBetModal(true);
      setQuantity(1);
      setAgree(false);
    }
  };

  const handleQuantity = (val) => {
    setQuantity((prev) => Math.max(1, prev + val));
  };

  const handleMultiplier = (mult) => {
    setQuantity(mult);
  };

  const handlePlaceBet = () => {
    if (!agree || timeLeft <= 5 || showResult) return;
    setBetHistory([
      ...betHistory,
      {
        period,
        color: selectedColor,
        number: selectedNumber,
        bigSmall: selectedBigSmall,
        quantity,
        gameType: gameType.label,
        timestamp: new Date().toISOString(), // Add timestamp
      },
    ]);
    setShowBetModal(false);
  };

  // Format seconds as MM:SS
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const ws = new WebSocket('wss://color-prediction-742i.onrender.com/ws');
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      // Example messages:
      // "20250611184103 2025-06-11 18:41:03.621055+05:30"
      // "20250611184103 6"
      const msg = event.data.trim();
      console.log('WebSocket raw message:', msg);

      // If message contains a space and a date, it's the period and start time
      if (/^\d{14} \d{4}-\d{2}-\d{2}/.test(msg)) {
        const [periodStr, ...rest] = msg.split(' ');
        const startTimeStr = rest.join(' ');
        const safeStartTimeStr = startTimeStr.replace(/\.\d+/, '');
        const startTime = new Date(safeStartTimeStr);
        const now = new Date();
        let elapsed = Math.floor((now - startTime) / 1000);
        let diff = 30 - elapsed;
        if (diff < 0) diff = 0;
        if (diff > 30) diff = 30;

        // If result modal is showing, queue the timer update
        if (showResult) {
          setNextPeriodInfo({ periodStr, diff });
        } else {
          setPendingPeriod(periodStr);
          setPeriod(periodStr);
          setTimeLeft(diff);
        }
      }
      // If message contains a period and a number, it's the result
      else if (/^\d{14} \d+$/.test(msg)) {
        const [periodStr, numberStr] = msg.split(' ');
        const number = parseInt(numberStr, 10);
        const { color, bigSmall } = getColorAndBigSmall(number);
        const result = { period: periodStr, number, color, bigSmall };

        setRoundResult(result);
        setShowResult(true);

        setResultHistory(prev => {
          if (prev.find(r => r.period === result.period)) return prev;
          return [{ ...result }, ...prev.slice(0, 19)];
        });

        setBetHistory(prev =>
          prev.map(bet =>
            bet.period === result.period ? { ...bet, result } : bet
          )
        );

        setTimeout(() => {
          setShowResult(false);
          setTimerKey(k => k + 1);
          setShowBetModal(false);
          // DO NOT setTimeLeft here!
        }, 3000);
      }
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    return () => ws.close();
  }, [gameType.duration]);

  // Handle next period info
  useEffect(() => {
    if (!showResult && nextPeriodInfo) {
      setPendingPeriod(nextPeriodInfo.periodStr);
      setPeriod(nextPeriodInfo.periodStr);
      setTimeLeft(nextPeriodInfo.diff);
      setNextPeriodInfo(null);
    }
  }, [showResult, nextPeriodInfo]);

  return (
    <div className="relative flex flex-col items-center min-w-[340px]">
      {/* Overlay for last 5 seconds */}
      {timeLeft <= 5 && !showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent transition-all">
          <div className="flex gap-4">
            <div className="bg-blue-700 rounded-xl w-28 h-40 flex items-center justify-center">
              <span className="text-[96px] font-extrabold text-blue-200 leading-none">
                {String(Math.floor(timeLeft / 10))}
              </span>
            </div>
            <div className="bg-blue-700 rounded-xl w-28 h-40 flex items-center justify-center">
              <span className="text-[96px] font-extrabold text-blue-200 leading-none">
                {String(timeLeft % 10)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Round Result Modal */}
      {showResult && roundResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent transition-all">
          <div className="bg-gradient-to-b from-blue-400 to-blue-600 rounded-3xl shadow-2xl px-8 pt-6 pb-8 min-w-[300px] mx-4 relative">

            {/* Trophy Icon */}
            <div className="flex justify-center mb-4">
              <div className="text-6xl">🏆</div>
            </div>

            {/* Round Result Title */}
            <div className="text-center mb-6">
              <h2 className="text-white text-2xl font-bold">Round Result</h2>
            </div>

            {/* Main Number Display */}
            <div className="flex items-center justify-center mb-6">
              <span className={`text-[120px] font-black drop-shadow-lg ${COLOR_CLASSES[roundResult.color]} leading-none`}>
                {roundResult.number}
              </span>
            </div>

            {/* Tags - Big/Small and Color */}
            <div className="flex justify-center gap-4 mb-4">
              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${roundResult.bigSmall === 'Big' ? 'bg-white text-black' : 'bg-white text-black'
                }`}>
                {roundResult.bigSmall}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${roundResult.color === 'green' ? 'bg-white text-black' :
                  roundResult.color === 'red' ? 'bg-white text-black' :
                    'bg-white text-black'
                }`}>
                {COLOR_LABELS[roundResult.color]}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Main UI, faded when last 5 seconds or result */}
      <div className={timeLeft <= 5 || showResult ? "pointer-events-none opacity-30 transition-all" : ""}>
        {/* Game Type Selection - Updated to match screenshot */}
        <div className="flex gap-0 mb-4 w-full justify-center">
          {GAME_TYPES.map((type) => (
            <button
              key={type.label}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl font-bold transition-all ${gameType.label === type.label
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-blue-200 text-blue-700 hover:bg-blue-300'
                }`}
              onClick={() => handleGameTypeChange(type)}
            >
              {/* Clock Icon */}
              <div className="text-lg mb-1">🕐</div>

              {/* Game Label */}
              <div className="text-xs text-center leading-tight">
                <div>Win Go</div>
                <div className="font-normal">
                  {type.label.includes('30Sec') ? '30Sec' :
                    type.label.includes('1Min') ? '1Min' :
                      type.label.includes('3Min') ? '3Min' : '5Min'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Timer and Period Section - Updated to match screenshot */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 mb-4 text-white relative">
          {/* How to play button */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-3 left-3 bg-blue-400 hover:bg-blue-300 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
          >
            <span>📖</span>
            How to play
          </button>

          {/* Current Game Type */}
          <div className="text-center mb-2 pt-8">
            <div className="text-sm opacity-90">{gameType.label}</div>
          </div>

          {/* Previous Results */}
          <div className="flex justify-center gap-1 mb-3">
            {resultHistory.slice(0, 5).map((res, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 ${res.color === 'green' ? 'bg-green-500 border-green-700' :
                    res.color === 'red' ? 'bg-red-500 border-red-700' :
                      'bg-purple-500 border-purple-700'
                  }`}
              >
                {res.number}
              </div>
            ))}
          </div>

          {/* Time Remaining Label */}
          <div className="text-center mb-2">
            <div className="text-sm opacity-90">Time remaining</div>
          </div>

          {/* Timer Display */}
          <div className="flex justify-center gap-2 mb-3">
            {formatTime(timeLeft).split('').map((char, idx) => (
              <div
                key={idx}
                className={`${char === ':'
                    ? 'flex items-center text-2xl font-bold text-white'
                    : 'bg-gray-800 text-white rounded-lg w-10 h-12 flex items-center justify-center text-xl font-bold'
                  }`}
              >
                {char}
              </div>
            ))}
          </div>

          {/* Period */}
          <div className="text-center">
            <div className="text-sm font-mono">{period}</div>
          </div>

          {/* Hidden Timer Component */}
          <div className="hidden">
            <Timer
              key={timerKey}
              duration={gameType.duration}
              onTimeUp={handleTimeUp}
              renderTime={formatTime}
              setTimeLeft={setTimeLeft}
            />
          </div>
        </div>

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-blue-500 to-blue-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">

              {/* Modal Header */}
              <div className="bg-blue-600 px-6 py-4 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-white text-lg font-bold">How to play</h2>
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="text-white text-xl font-bold hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 text-white overflow-y-auto max-h-[60vh]">
                <div className="space-y-4 text-sm leading-relaxed">
                  <p>
                    30 sec 1 issue, 25 sec to order, 5 seconds waiting for the
                    draw. It opens all day. The total number of trade is 2880 issues.
                  </p>
                  <p>
                    If you spend 100 to trade, after deducting service fee 2%, contract amount: 98
                  </p>

                  <div className="space-y-2">
                    <p>1. Select green: if the result shows 1,3,7,9 you will get (98*2) 196; If the result shows 5, you will get (98*1.5) 147</p>
                    <p>2. Select red: if the result shows 2,4,6,8 you will get (98*2) 196; If the result shows 0, you will get (98*1.5) 147</p>
                    <p>3. Select violet: if the result shows 0 or 5, you will get (98*2) 196</p>
                    <p>4. Select number: if the result is the same as the number you selected, you will get (98*9) 882</p>
                    <p>5. Select big: if the result shows 5,6,7,8,9 you will get (98*2) 196</p>
                    <p>6. Select small: if the result shows 0,1,2,3,4 you will get (98*2) 196</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="p-4">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 rounded-lg font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color Buttons */}
        <div className="flex gap-1 mb-4 w-full justify-center">
          <button
            className="bg-green-500 hover:bg-green-600 text-white w-full px-8 py-3 rounded-l-2xl font-bold text-lg transition-all"
            onClick={() => handleColorClick('green')}
          >
            Green
          </button>
          <button
            className="bg-purple-500 hover:bg-purple-600 text-white w-full px-8 py-3 font-bold text-lg transition-all"
            onClick={() => handleColorClick('violet')}
          >
            Violet
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white w-full px-8 py-3 rounded-r-2xl font-bold text-lg transition-all"
            onClick={() => handleColorClick('red')}
          >
            Red
          </button>
        </div>

        {/* Number Buttons - Two rows layout */}
        <div className="flex flex-col gap-2 mb-4 w-full justify-center">
          {/* First row: 0-4 */}
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3, 4].map((num) => (
              <button
                key={num}
                className={`w-12 h-12 rounded-full font-bold text-white text-lg flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
                  NUMBER_COLORS[num] === 'green' ? 'bg-green-500' :
                  NUMBER_COLORS[num] === 'red' ? 'bg-red-500' :
                  'bg-purple-500'
                }`}
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </button>
            ))}
          </div>
          
          {/* Second row: 5-9 */}
          <div className="flex gap-2 justify-center">
            {[5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className={`w-12 h-12 rounded-full font-bold text-white text-lg flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
                  NUMBER_COLORS[num] === 'green' ? 'bg-green-500' :
                  NUMBER_COLORS[num] === 'red' ? 'bg-red-500' :
                  'bg-purple-500'
                }`}
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Big/Small Buttons */}
        <div className="flex gap-0 mb-4 w-full px-4 justify-center">
          <button className="bg-orange-500 text-white w-full px-8 py-2 rounded-lg font-bold" onClick={() => handleBigSmallClick('Small')}>Small</button>
          <button className="bg-blue-500 text-white w-full px-8 py-2 rounded-lg font-bold" onClick={() => handleBigSmallClick('Big')}>Big</button>
        </div>

        {/* Bet Modal */}
        {showBetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-[#18192b] rounded-xl shadow-lg w-[350px] p-4 relative">
              {/* Header */}
              <div className={`rounded-t-xl px-4 py-2 text-center ${selectedColor ? 'bg-gradient-to-b from-green-500 to-green-400' : 'bg-gradient-to-b from-blue-500 to-blue-400'}`}>
                <div className="text-white font-bold text-lg">{gameType.label}</div>
                {selectedColor && (
                  <div className="bg-white rounded mt-2 py-1 px-2 text-black font-semibold">
                    Select <span className="text-green-600">{COLOR_LABELS[selectedColor]}</span>
                  </div>
                )}
                {selectedNumber !== null && (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-white text-base mb-1">Select Number</span>
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold border-2
                        ${NUMBER_COLORS[selectedNumber] === 'green' ? 'bg-green-500 text-white border-green-700'
                          : NUMBER_COLORS[selectedNumber] === 'red' ? 'bg-red-500 text-white border-red-700'
                            : 'bg-purple-600 text-white border-purple-800'}
                      `}
                    />
                    {selectedNumber}

                  </div>
                )}
                {selectedBigSmall && (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-white text-base mb-1">Select Size</span>
                    <span
                      className={`px-4 py-2 rounded-lg text-lg font-bold border-2 ${selectedBigSmall === 'Big' ? 'bg-blue-500 text-white border-blue-700' : 'bg-orange-500 text-white border-orange-700'
                        }`}
                    >
                      {selectedBigSmall}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                {/* Balance */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Balance</span>
                  <div className="flex gap-2">
                    {[1, 10, 100, 1000].map((amt) => (
                      <button
                        key={amt}
                        className="bg-blue-700 text-white px-2 py-1 rounded font-bold"
                        onClick={() => setQuantity(amt)}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Quantity */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button className="bg-blue-700 text-white px-2 py-1 rounded" onClick={() => handleQuantity(-1)}>-</button>
                    <span className="bg-white text-black px-3 py-1 rounded">{quantity}</span>
                    <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleQuantity(1)}>+</button>
                  </div>
                </div>
                {/* Multipliers */}
                <div className="flex gap-2 mb-2">
                  {[1, 5, 10, 20, 50, 100].map((mult) => (
                    <button
                      key={mult}
                      className={`px-2 py-1 rounded font-bold ${quantity === mult ? 'bg-green-500 text-white' : 'bg-blue-700 text-white'}`}
                      onClick={() => handleMultiplier(mult)}
                    >
                      X{mult}
                    </button>
                  ))}
                </div>
                {/* Agree */}
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={() => setAgree(!agree)}
                    className="accent-green-500 mr-2"
                    id="agree"
                  />
                  <label htmlFor="agree" className="text-white">I agree</label>
                  <span className="text-red-400 ml-2 text-xs">{`<Pre-sale rules>`}</span>
                </div>
                {/* Buttons */}
                <div className="flex">
                  <button
                    className="flex-1 bg-blue-800 text-white py-2 rounded-l-lg font-bold"
                    onClick={() => setShowBetModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-r-lg font-bold ${agree && timeLeft > 5 && !showResult ? 'bg-green-500 text-white' : 'bg-green-300 text-white cursor-not-allowed'}`}
                    disabled={!agree || timeLeft <= 5 || showResult}
                    onClick={handlePlaceBet}
                  >
                    Total Amount&nbsp;{quantity}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game History */}


        {/* Tabs for History and My Bets */}
        <div className="flex gap-2 mb-2 w-full justify-center">
          <button
            className={`px-4 py-1 rounded font-bold ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-gray-700'}`}
            onClick={() => setActiveTab('history')}
          >
            Game History
          </button>
          <button
            className={`px-4 py-1 rounded font-bold ${activeTab === 'mybets' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-gray-700'}`}
            onClick={() => setActiveTab('mybets')}
          >
            My Bets
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' ? (
          // Game History Table
          <div className="w-full">
            {/* Update the Game History Table header */}
            <div className="bg-blue-900 text-white rounded-t-lg px-4 py-2 flex justify-between font-bold">
              <span>Period</span>
              <span>Number</span>
              <span>Big/Small</span>
              <span>Color</span>
            </div>
            <div className="bg-white rounded-b-lg">
              {resultHistory.slice(0, 10).map((res, idx) => (
                <div key={idx} className="flex justify-between px-4 py-1 border-b last:border-b-0 items-center">
                  <span className="text-gray-700">{res.period}</span>
                  <span className={`font-bold text-lg ${COLOR_CLASSES[res.color]}`}>{res.number}</span>
                  <span className={`font-bold text-sm px-2 py-1 rounded ${res.bigSmall === 'Big' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                    }`}>{res.bigSmall}</span>
                  <span className={`font-bold capitalize ${COLOR_CLASSES[res.color]}`}>{COLOR_LABELS[res.color]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // My Bets Table - Updated to match screenshot
          <div className="w-full">
            <div className="space-y-2">
              {betHistory.slice(-10).reverse().map((bet, idx) => {
                // Find result for this bet
                const res = resultHistory.find(r => r.period === bet.period);
                let win = false;
                if (res) {
                  if (
                    (bet.color && bet.color === res.color) ||
                    (bet.number !== null && bet.number === res.number) ||
                    (bet.bigSmall && bet.bigSmall === res.bigSmall)
                  ) {
                    win = true;
                  }
                }

                // Use stored timestamp or generate current for older bets
                const betTimestamp = bet.timestamp ? new Date(bet.timestamp) : new Date();
                const dateStr = betTimestamp.toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\//g, '-');
                const timeStr = betTimestamp.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div key={idx} className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      {/* Left side - Color indicator */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg ${bet.color === 'green' ? 'bg-green-500' :
                            bet.color === 'violet' ? 'bg-purple-500' :
                              bet.color === 'red' ? 'bg-red-500' :
                                bet.number !== null ? (
                                  NUMBER_COLORS[bet.number] === 'green' ? 'bg-green-500' :
                                    NUMBER_COLORS[bet.number] === 'red' ? 'bg-red-500' : 'bg-purple-500'
                                ) :
                                  bet.bigSmall === 'Big' ? 'bg-blue-500' : 'bg-orange-500'
                          }`}>
                          {bet.number !== null ? bet.number :
                            bet.color ? (bet.color === 'violet' ? 'V' : bet.color.charAt(0).toUpperCase()) :
                              bet.bigSmall ? (bet.bigSmall === 'Big' ? 'B' : 'S') : '?'}
                        </div>

                        <div className="text-white">
                          <div className="font-bold text-lg">{bet.period}</div>
                          <div className="text-blue-200 text-sm">{dateStr} {timeStr}</div>
                        </div>
                      </div>

                      {/* Right side - Status and Amount */}
                      <div className="flex items-center gap-4">
                        {/* Status */}
                        <div className="text-center">
                          {res ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${win ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                              }`}>
                              {win ? 'Win' : 'Fail'}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-500 text-white">
                              Pending
                            </span>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <div className={`font-bold text-lg ${res ? (win ? 'text-green-400' : 'text-red-400') : 'text-yellow-400'
                            }`}>
                            {res ? (win ? `+${bet.quantity}` : `-${bet.quantity}`) : `-${bet.quantity}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Show message if no bets */}
              {betHistory.length === 0 && (
                <div className="text-center text-blue-200 py-8">
                  <div className="text-4xl mb-2">🎲</div>
                  <div>No bets placed yet</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameBoard;