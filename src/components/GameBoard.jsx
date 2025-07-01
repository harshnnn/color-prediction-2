import React, { useState, useEffect, useRef, useCallback } from 'react';
import Timer from './Timer';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Deposit from './Deposit';
import Withdrawal from './Withdrawal';
import Navbar from './Navbar';


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

// Move this outside the component - defined once
const TYPE_MAP = {
    'Win Go 30Sec': '30S',
    'Win Go 1Min': '1M',
    'Win Go 3Min': '3M',
    'Win Go 5Min': '5M',
};

// Helper to get color and big/small from number
function getColorAndBigSmall(number) {
    let color = '';
    if (number === 0 || number === 5) color = 'violet';
    else if (number % 2 === 1) color = 'green';
    else color = 'red';
    const bigSmall = number < 5 ? 'Small' : 'Big';
    return { color, bigSmall };
}



function GameBoard() {
    const { logout } = useAuth();
    const navigate = useNavigate();

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
    const [timeLeft, setTimeLeft] = useState(0);
    const timerIntervalRef = useRef(null);
    const [resultHistory, setResultHistory] = useState([]);
    const [roundResult, setRoundResult] = useState(null);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [activeTab, setActiveTab] = useState('history');
    const [nextPeriodInfo, setNextPeriodInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wsReady, setWsReady] = useState(false);
    const [wsTimeout, setWsTimeout] = useState(false);
    const [balancePerBet, setBalancePerBet] = useState(1);
    const [betPlacing, setBetPlacing] = useState(false);
    const [betPlaceError, setBetPlaceError] = useState(null);
    // Add these state variables for API bets (move to top-level with other useState)
    const [apiBets, setApiBets] = useState([]);
    const [betsLoading, setBetsLoading] = useState(false);
    const [betsError, setBetsError] = useState(null);
    const [latestPeriods, setLatestPeriods] = useState({
        '30S': null,
        '1M': null,
        '3M': null,
        '5M': null
    });
    const periodEndTimeRef = useRef(null);

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
                // Remove tokens if refresh fails
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                navigate('/login', { replace: true });
                return null;
            }
            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                return data.access_token;
            }
            navigate('/login', { replace: true });
            return null;
        } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            navigate('/login', { replace: true });
            return null;
        }
    }, [navigate]);

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

    // Helper to get a valid access token, refresh if needed, redirect if refresh fails
    const getValidAccessToken = useCallback(async () => {
        let accessToken = localStorage.getItem('access_token');
        if (accessToken && !isTokenExpired(accessToken)) {
            return accessToken;
        }
        // Try to refresh
        const refreshed = await tryRefreshToken();
        if (refreshed) return refreshed;
        // If refresh fails, navigate to login (handled in tryRefreshToken)
        return null;
    }, [tryRefreshToken]);

    // 1. Fetch result history only once on mount
    // Replace the existing result history fetch useEffect with this:
    useEffect(() => {
        // Map gameType.label to type_ param for API
        const type_ = TYPE_MAP[gameType.label] || '30S';

        const fetchHistory = async () => {
            try {
                setLoading(true);
                const res = await fetch(`https://color-prediction-742i.onrender.com/results?type_=${type_}`);
                const data = await res.json();
                const mapped = data
                    .filter(r => r.number !== -1)
                    .map(r => ({
                        ...r,
                        ...getColorAndBigSmall(r.number)
                    }));
                setResultHistory(mapped);
            } catch (e) {
                // handle error
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [gameType]);

    function parsePeriodToUTCDate(period) {
        const year = period.slice(0, 4);
        const month = period.slice(4, 6);
        const day = period.slice(6, 8);
        const hour = period.slice(8, 10);
        const min = period.slice(10, 12);
        const sec = period.slice(12, 14);
        // Parse as UTC
        return new Date(Date.UTC(
            Number(year),
            Number(month) -1,
            Number(day),
            Number(hour),
            Number(min),
            Number(sec)-2
        ));
    }


    // --- WebSocket & Timer Logic ---

    const [periods, setPeriods] = useState({
        '30S': { period: '', endTime: null, timeLeft: 0, result: null },
        '1M': { period: '', endTime: null, timeLeft: 0, result: null },
        '3M': { period: '', endTime: null, timeLeft: 0, result: null },
        '5M': { period: '', endTime: null, timeLeft: 0, result: null },
    });
    const timerRefs = useRef({});

    useEffect(() => {
        const ws = new WebSocket('wss://color-prediction-742i.onrender.com/ws');
        ws.onopen = () => setWsReady(true);

        ws.onmessage = (event) => {
            const msg = event.data.trim();

            // Period message: "20250701194956 30S 2025-07-01 19:49:56.678930+05:30"
            const periodMatch = msg.match(/^(\d{14}) (30S|1M|3M|5M) (\d{4}-\d{2}-\d{2}.+)$/);
            if (periodMatch) {
                const [, periodStr, type_] = periodMatch;

                // Use your helper to get the period end time (UTC)
                const periodEndTime = parsePeriodToUTCDate(periodStr);

                // Get the duration for this game type
                const duration = GAME_TYPES.find(g => TYPE_MAP[g.label] === type_).duration;

                setPeriods(prev => {
                    // Clear previous timer for this type
                    if (timerRefs.current[type_]) clearInterval(timerRefs.current[type_]);
                    // Calculate the real time left, always positive and within [0, duration]
                    const now = new Date();
                    let diff = Math.floor((periodEndTime - now) / 1000);
                    let timeLeft = ((diff % duration) + duration) % duration;
                    // Start new timer for this type
                    timerRefs.current[type_] = setInterval(() => {
                        setPeriods(p => {
                            const nowTick = new Date();
                            let diffTick = Math.floor((periodEndTime - nowTick) / 1000);
                            let timeLeftTick = ((diffTick % duration) + duration) % duration;
                            return {
                                ...p,
                                [type_]: { ...p[type_], timeLeft: timeLeftTick }
                            };
                        });
                    }, 1000);

                    return {
                        ...prev,
                        [type_]: { ...prev[type_], period: periodStr, timeLeft, result: null }
                    };
                });
                return;
            }

            // Result message: "20250701194926 30S 1"
            const resultMatch = msg.match(/^(\d{14}) (30S|1M|3M|5M) (\d+)$/);
            if (resultMatch) {
                const [, periodStr, type_, numberStr] = resultMatch;
                const number = parseInt(numberStr, 10);
                const { color, bigSmall } = getColorAndBigSmall(number);
                const result = { period: periodStr, number, color, bigSmall };

                setPeriods(prev => ({
                    ...prev,
                    [type_]: { ...prev[type_], result }
                }));
            }
        };

        ws.onerror = () => setWsReady(false);
        ws.onclose = () => setWsReady(false);

        return () => {
            ws.close();
            Object.values(timerRefs.current).forEach(clearInterval);
        };
    }, []);

    // Show timer and result for only the selected game type
    const currentType = TYPE_MAP[gameType.label];
    const { period: currentPeriod, timeLeft: currentTimeLeft, result: currentResult } = periods[currentType] || {};

    // When switching game type, update UI to show correct timer/result
    useEffect(() => {
        setPeriod(currentPeriod || '');
        setTimeLeft(currentTimeLeft || 0);
        setRoundResult(currentResult || null);
        setShowResult(!!currentResult);
    }, [currentType, currentPeriod, currentTimeLeft, currentResult]);

    // When a result is shown, hide it after 1.25s and clear from state
    useEffect(() => {
        if (showResult && currentResult) {
            const t = setTimeout(() => {
                setShowResult(false);
                setRoundResult(null);
                setPeriods(prev => ({
                    ...prev,
                    [currentType]: { ...prev[currentType], result: null }
                }));
            }, 1250);
            return () => clearTimeout(t);
        }
    }, [showResult, currentResult, currentType]);

    // Handler for switching game type
    const handleGameTypeChange = (type) => {
        setGameType(type);
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

    const handleSetQuantity = (val) => {
        setQuantity(val);
    };

    // Helper to get prediction string for API
    const getPredictionString = () => {
        if (selectedColor) return selectedColor;
        if (selectedBigSmall) return selectedBigSmall.toLowerCase();
        if (selectedNumber !== null && selectedNumber !== undefined) {
            // Map 0-9 to "zero", "one", ..., "nine"
            const numWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
            return numWords[selectedNumber];
        }
        return "";
    };

    const handlePlaceBet = async () => {
        if (!agree || timeLeft <= 5 || showResult) return;
        setBetPlaceError(null);
        setBetPlacing(true);

        const prediction = getPredictionString();
        const amount = balancePerBet * quantity;
        const payload = {
            amount,
            prediction,
            period,
        };

        try {
            let token = await getValidAccessToken();
            if (!token) {
                setBetPlaceError("No authentication token found.");
                toast.error("No authentication token found.", { position: "top-center" });
                setBetPlacing(false);
                return;
            }
            const res = await fetch('https://color-prediction-742i.onrender.com/bets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                // Show backend error in toast
                const backendMsg = data.message || data.detail || "Failed to place bet.";
                setBetPlaceError(backendMsg);
                toast.error(`Bet failed: ${backendMsg}`, { position: "top-center" });
                setBetPlacing(false);
                return;
            }
            setShowBetModal(false);
            toast.success(`Bet of amount ${amount} placed successfully.`, { position: "top-center" });
        } catch (err) {
            setBetPlaceError(err.message || "Failed to place bet.");
            toast.error(`Bet failed: ${err.message || "Failed to place bet."}`, { position: "top-center" });
        } finally {
            setBetPlacing(false);
        }
    };

    // Format seconds as MM:SS
    const formatTime = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    useEffect(() => {
        if (!wsReady) {
            const timeout = setTimeout(() => setWsTimeout(true), 8000); // 8 seconds
            return () => clearTimeout(timeout);
        } else {
            setWsTimeout(false);
        }
    }, [wsReady]);

    // Helper to fetch bets from API
    const fetchApiBets = useCallback(async () => {
        setBetsLoading(true);
        setBetsError(null);
        setApiBets([]);
        let token = await getValidAccessToken();
        if (!token) {
            setBetsError('No authentication token found.');
            setBetsLoading(false);
            return;
        }
        try {
            const res = await fetch('https://color-prediction-742i.onrender.com/bets', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) throw new Error('Failed to fetch bets.');
            const data = await res.json();
            setApiBets(Array.isArray(data) ? data : (Array.isArray(data.bets) ? data.bets : []));
        } catch (err) {
            setBetsError(err.message || 'An error occurred.');
        } finally {
            setBetsLoading(false);
        }
    }, []);

    // Fetch bets when "My Bets" tab is selected
    useEffect(() => {
        if (activeTab === 'mybets') {
            fetchApiBets();
        }
    }, [activeTab, fetchApiBets]);

    // Fetch bets when a new period starts (i.e., after result, new timer)
    useEffect(() => {
        if (activeTab === 'mybets' && period) {
            fetchApiBets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    // Fetch bets after placing a bet (if on mybets tab)
    useEffect(() => {
        if (!betPlacing && activeTab === 'mybets' && showBetModal === false) {
            fetchApiBets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [betPlacing, showBetModal]);

    if (loading || !wsReady) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-200"></div>
                    <div className="text-blue-700 font-bold text-xl">
                        {wsTimeout
                            ? "Unable to connect to game server. Please check your connection or try again later."
                            : "Loading..."}
                    </div>
                </div>
            </div>
        );
    }




    // Main wrapper with improved background gradient
    return (
        <div className="relative flex flex-col items-center min-w-[340px] bg-gradient-to-b from-[#111827] to-[#1f2937] min-h-screen  py-0">
            <ToastContainer />

            {/* Navbar */}
            <Navbar />

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

            {/* Round Result Modal - Enhanced with animations */}
            {showResult && roundResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-gradient-to-b from-blue-500 to-blue-700 rounded-3xl shadow-2xl px-8 pt-8 pb-8 max-w-[90%] w-[400px] mx-4 relative border border-blue-300 animate-bounceIn">
                        {/* Trophy Icon with animation */}
                        <div className="flex justify-center mb-6">
                            <div className="text-6xl animate-bounce">🏆</div>
                        </div>

                        {/* Round Result Title */}
                        <div className="text-center mb-6">
                            <h2 className="text-white text-2xl font-bold">Round Result</h2>
                        </div>

                        {/* Main Number Display with animation */}
                        <div className="flex items-center justify-center mb-8">
                            <span className={`text-[120px] font-black drop-shadow-xl ${COLOR_CLASSES[roundResult.color]} leading-none animate-scaleIn`}>
                                {roundResult.number}
                            </span>
                        </div>

                        {/* Tags - Big/Small and Color - Enhanced */}
                        <div className="flex justify-center gap-4 mb-2">
                            <span className={`px-5 py-2 rounded-full text-sm font-bold uppercase ${roundResult.bigSmall === 'Big'
                                ? 'bg-blue-600 text-white'
                                : 'bg-orange-500 text-white'
                                } shadow-lg`}>
                                {roundResult.bigSmall}
                            </span>
                            <span className={`px-5 py-2 rounded-full text-sm font-bold uppercase ${roundResult.color === 'green'
                                ? 'bg-green-500 text-white' :
                                roundResult.color === 'red'
                                    ? 'bg-red-500 text-white' :
                                    'bg-purple-500 text-white'
                                } shadow-lg`}>
                                {COLOR_LABELS[roundResult.color]}
                            </span>
                        </div>

                    </div>
                </div>
            )}

            {/* Main UI, faded when last 5 seconds or result */}
            <div className={timeLeft <= 5 || showResult ? "pointer-events-none opacity-30 transition-all bg-[#22275b] p-2" : "bg-[#22275b] p-2"}>
                {/* Game Type Selection - Enhanced with animations */}
                <div className="flex gap-0 mb-6 w-full justify-center">
                    {GAME_TYPES.map((type, idx) => {
                        // Determine border radius for each button
                        let borderRadiusStyle = {};
                        if (gameType.label === type.label) {
                            // If selected, all corners 10px
                            borderRadiusStyle = {
                                borderRadius: '10px',
                            };
                        } else if (idx === 0) {
                            borderRadiusStyle = {
                                borderTopLeftRadius: '10px',
                                borderBottomLeftRadius: '10px',
                                borderTopRightRadius: '0px',
                                borderBottomRightRadius: '0px',
                            };
                        } else if (idx === GAME_TYPES.length - 1) {
                            borderRadiusStyle = {
                                borderTopLeftRadius: '0px',
                                borderBottomLeftRadius: '0px',
                                borderTopRightRadius: '10px',
                                borderBottomRightRadius: '10px',
                            };
                        } else {
                            borderRadiusStyle = {
                                borderRadius: '0px',
                            };
                        }
                        return (
                            <button
                                key={type.label}
                                className={`flex flex-col items-center justify-center w-23 h-23 font-sm transition-all transform hover:scale-105 ${gameType.label === type.label
                                    ? '!bg-gradient-to-b !from-[#2aaaf3] !to-[#2979f2] text-white shadow-lg scale-101 border-1 border-blue-300'
                                    : 'bg-[#37499e] text-gray-300 hover:bg-[#3e379e] border border-gray-700'
                                    }`}
                                style={borderRadiusStyle}
                                onClick={() => handleGameTypeChange(type)}
                            >
                                <div className="text-xl mb-1">🕐</div>
                                <div className="text-xs text-center leading-tight">
                                    <div>Win Go</div>
                                    <div className="font-normal">
                                        {type.label.includes('30Sec') ? '30Sec' :
                                            type.label.includes('1Min') ? '1Min' :
                                                type.label.includes('3Min') ? '3Min' : '5Min'}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Timer and Period Section - Ticket style, smaller & responsive, always show divider & cutouts */}
                <div
                    className="relative flex items-center justify-between gap-10  bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-2 sm:p-4 mb-4 text-white shadow-xl overflow-visible w-full   mx-auto"
                    style={{ minHeight: 90 }}
                >
                    {/* Top semicircle cutout */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-10">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#22275b] rounded-full"></div>
                    </div>
                    {/* Bottom semicircle cutout */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-10">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#22275b] rounded-full"></div>
                    </div>
                    {/* Dotted vertical divider - always visible */}
                    <div className="absolute top-3 bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center">
                        <div className="border-l-2 border-dotted border-white opacity-40 h-full"></div>
                    </div>
                    {/* Left side */}
                    <div className="flex-1 w-full sm:w-auto sm:min-w-[90px] pr-0 sm:pr-2 relative z-30 flex flex-col items-center sm:items-start">
                        {/* How to play button */}
                        <button
                            onClick={() => setShowHowToPlay(true)}
                            className="bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded-full text-xs font-sm flex items-center gap-1 transition-colors shadow mb-1"
                        >
                            <span>📖</span>
                            How to play
                        </button>
                        {/* Current Game Type */}
                        <div className="text-center sm:text-left mb-1 mt-1">
                            <div className="text-xs sm:text-xs font-md">{gameType.label.replace('Win Go ', 'Win ')}</div>
                        </div>
                        {/* Previous Results - Ball style */}
                        <div className="flex justify-center sm:justify-start gap-1 mb-1">
                            {resultHistory.slice(0, 5).map((res, idx) => (
                                <div
                                    key={idx}
                                    className="w-7 h-7 flex items-center justify-center"
                                    style={{ minWidth: 28, minHeight: 28 }}
                                >
                                    <img
                                        src={`/buttons/${res.number}btn.png`}
                                        alt={res.number}
                                        className="w-7 h-7 object-contain pointer-events-none select-none"
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Right side */}
                    <div className="flex-1 w-full sm:w-auto sm:min-w-[90px] pl-0 sm:pl-2 relative z-30 flex flex-col items-center justify-center">
                        {/* Time Remaining Label */}
                        <div className="text-center mb-1">
                            <div className="text-xs sm:text-sm font-bold opacity-90">Time remaining</div>
                        </div>
                        {/* Timer Display */}
                        <div className="flex justify-center gap-0.5 sm:gap-1 mb-1">
                            {formatTime(timeLeft).split('').map((char, idx) => (
                                <div
                                    key={idx}
                                    className={`${char === ':'
                                        ? 'flex items-center text-base sm:text-xl font-bold text-white'
                                        : 'bg-[#181f3a] text-white rounded-lg w-6 h-7 sm:w-8 sm:h-9 flex items-center justify-center text-base sm:text-xl font-bold shadow'
                                        }`}
                                >
                                    {char}
                                </div>
                            ))}
                        </div>
                        {/*Current Period */}
                        <div className="text-center">
                            <div className="text-xs sm:text-sm font-mono bg-gradient-to-r from-blue-700 to-indigo-500 inline-block px-2 py-0.5 rounded-full shadow">{period}</div>
                        </div>
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

                {/* Color Buttons - Enhanced with glassmorphism */}
                <div className="flex gap-3 mb-5 w-full justify-center bg-[#28306a] px-2 py-2 rounded-xl">
                    <button
                        className="bg-[#22c55e] text-white w-full max-w-[136px] h-[45px] flex items-center justify-center font-normal text-xl"
                        style={{
                            borderTopLeftRadius: '0px',
                            borderBottomLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            borderBottomRightRadius: '0px',
                            background: '#22c55e',
                            boxShadow: 'none',
                            border: 'none',
                            padding: 0,
                            minWidth: 0,
                        }}
                        onClick={() => handleColorClick('green')}
                    >
                        Green
                    </button>
                    <button
                        className="bg-[#a259e6] text-white w-full max-w-[130px] h-[45px] py-3 rounded-xl font-medium text-lg transition-all hover:brightness-110"
                        style={{ boxShadow: 'none', border: 'none' }}
                        onClick={() => handleColorClick('violet')}
                    >
                        Violet
                    </button>
                    <button
                        className="bg-[#e04a4a] text-white w-full max-w-[136px] h-[45px] flex items-center justify-center font-normal text-xl"
                        style={{
                            borderTopLeftRadius: '20px',
                            borderBottomLeftRadius: '0px',
                            borderTopRightRadius: '0px',
                            borderBottomRightRadius: '20px',
                            background: '#e04a4a',
                            boxShadow: 'none',
                            border: 'none',
                            padding: 0,
                            minWidth: 0,
                        }}
                        onClick={() => handleColorClick('red')}
                    >
                        Red
                    </button>
                </div>

                {/* Number Buttons - Enhanced with animations */}
                <div className="flex flex-col gap-3 mb-5 w-full justify-center bg-[#1E2A44] p-2">
                    {/* First row: 0-4 */}
                    <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3, 4].map((num) => (
                            <button
                                key={num}
                                className="w-14 h-14 rounded-full p-0 border-none bg-transparent shadow-none transition-all transform hover:scale-110"
                                onClick={() => handleNumberClick(num)}
                                style={{ outline: 'none' }}
                            >
                                <img
                                    src={`/buttons/${num}btn.png`}
                                    alt={num}
                                    className="w-16 h-16 object-contain pointer-events-none select-none"
                                    draggable={false}
                                />
                            </button>
                        ))}
                    </div>
                    {/* Second row: 5-9 */}
                    <div className="flex gap-3 justify-center">
                        {[5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                className="w-14 h-14 rounded-full p-0 border-none bg-transparent shadow-none transition-all transform hover:scale-110"
                                onClick={() => handleNumberClick(num)}
                                style={{ outline: 'none' }}
                            >
                                <img
                                    src={`/buttons/${num}btn.png`}
                                    alt={num}
                                    className="w-16 h-16 object-contain pointer-events-none select-none"
                                    draggable={false}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Big/Small Buttons - Enhanced design */}
                <div className="flex gap-0 mb-6 w-full max-w-md mx-auto justify-center">
                    <button
                        className="bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white w-full px-8 py-3 rounded-xl font-medium shadow-lg transform hover:scale-105 transition-all"
                        style={{
                            borderTopLeftRadius: '20px',
                            borderBottomLeftRadius: '20px',
                            borderTopRightRadius: '0px',
                            borderBottomRightRadius: '0px',
                        }}
                        onClick={() => handleBigSmallClick('Small')}
                    >
                        Small (0-4)
                    </button>
                    <button
                        className="bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white w-full px-8 py-3 rounded-xl font-medium shadow-lg transform hover:scale-105 transition-all"
                        style={{
                            borderTopLeftRadius: '0px',
                            borderBottomLeftRadius: '0px',
                            borderTopRightRadius: '20px',
                            borderBottomRightRadius: '20px',
                        }}
                        onClick={() => handleBigSmallClick('Big')}
                    >
                        Big (5-9)
                    </button>
                </div>

                {/* Bet Modal - Enhanced with glassmorphism */}
                {showBetModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-gradient-to-br from-[#1a1f35] to-[#131829] rounded-xl shadow-2xl w-[350px] p-0 relative border border-blue-400/30 animate-scaleIn">
                            {/* Header */}
                            <div className={`rounded-t-xl px-4 py-4 text-center ${selectedColor
                                ? `bg-gradient-to-b from-${selectedColor}-500 to-${selectedColor}-600`
                                : 'bg-gradient-to-b from-blue-500 to-blue-600'
                                }`}>
                                {/* Header content remains the same */}
                                <div className="text-white font-meduim text-xl">{gameType.label}</div>
                                {/* Selection display logic... */}
                            </div>

                            <div className="p-5">
                                {/* Balance */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white text-lg">Balance</span>
                                    <div className="flex gap-2">
                                        {[1, 10, 100, 1000].map((amt) => (
                                            <button
                                                key={amt}
                                                className={`${balancePerBet === amt
                                                    ? 'bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-300 text-white'
                                                    : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200 hover:from-blue-600 hover:to-blue-700'
                                                    } px-3 py-2 rounded font-medium transition-all`}
                                                onClick={() => setBalancePerBet(amt)}
                                            >
                                                {amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white text-lg">Quantity</span>
                                    <div className="flex items-center gap-2">
                                        <button className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-medium transition-all" onClick={() => handleQuantity(-1)}>-</button>
                                        <span className="bg-gray-800 text-white px-4 py-2 rounded min-w-[40px] text-center font-medium">{quantity}</span>
                                        <button className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-medium transition-all" onClick={() => handleQuantity(1)}>+</button>
                                    </div>
                                </div>

                                {/* Multipliers - Enhanced buttons */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {[1, 5, 10, 20, 50, 100].map((val) => (
                                        <button
                                            key={val}
                                            className={`py-2 rounded font-medium transition-all ${quantity === val
                                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                                                : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700'
                                                }`}
                                            onClick={() => handleSetQuantity(val)}
                                        >
                                            X{val}
                                        </button>
                                    ))}
                                </div>

                                {/* Agree checkbox with enhanced styling */}
                                <div className="flex items-center mb-4 bg-gray-800 p-3 rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={agree}
                                        onChange={() => setAgree(!agree)}
                                        className="w-5 h-5 accent-green-500 mr-3"
                                        id="agree"
                                    />
                                    <label htmlFor="agree" className="text-white flex-1">I agree to the betting rules</label>
                                    <span className="text-blue-400 text-xs cursor-pointer hover:underline">{`<Terms>`}</span>
                                </div>

                                {/* Action Buttons - Enhanced */}
                                <div className="flex gap-3">
                                    <button
                                        className="flex-1 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white py-3 rounded-lg font-medium transition-all"
                                        onClick={() => setShowBetModal(false)}
                                        disabled={betPlacing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`flex-1 py-3 rounded-lg font-medium ${agree && timeLeft > 5 && !showResult && !betPlacing
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white'
                                            : 'bg-gradient-to-br from-green-600/50 to-green-700/50 text-white/70 cursor-not-allowed'
                                            }`}
                                        disabled={!agree || timeLeft <= 5 || showResult || betPlacing}
                                        onClick={handlePlaceBet}
                                    >
                                        {betPlacing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Placing...
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span>Place Bet</span>
                                                <span className="text-sm">{balancePerBet * quantity}</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game History */}

                {/* Tabs for History and My Bets - Enhanced */}
                <div className="flex w-full mb-3">
                    <button
                        className={`px-6 py-2 font-medium transition-all ${activeTab === 'history'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        style={{
                            borderTopLeftRadius: '15px',
                            borderBottomLeftRadius: '15px',
                            borderTopRightRadius: '15px',
                            borderBottomRightRadius: '15px',
                        }}
                        onClick={() => setActiveTab('history')}
                    >
                        Game History
                    </button>
                    <div className="flex-1" />
                    <button
                        className={`px-6 py-2 font-medium transition-all ${activeTab === 'mybets'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        style={{
                            borderTopLeftRadius: '15px',
                            borderBottomLeftRadius: '15px',
                            borderTopRightRadius: '15px',
                            borderBottomRightRadius: '15px',
                        }}
                        onClick={() => setActiveTab('mybets')}
                    >
                        My Bets
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'history' ? (
                    // Game History Table with mobile-responsive grid
                    <div className="w-full">
                        {/* Table Header - Mobile responsive */}
                        <div className="bg-blue-900 text-white rounded-t-lg px-2 py-2 grid grid-cols-12 gap-1 font-medium">
                            <div className="col-span-5 text-left pl-2">Period</div>
                            <div className="col-span-2 text-center">No.</div>
                            <div className="col-span-3 text-center">Big/Small</div>
                            <div className="col-span-2 text-center">Color</div>
                        </div>
                        <div className="bg-[#2B3270] rounded-b-lg">
                            {resultHistory.slice(0, 10).map((res, idx) => (
                                <div key={res.period} className="grid grid-cols-12 gap-1 px-2 py-2 border-b last:border-b-0 items-center">
                                    {/* Period - more space, smaller font, truncate if needed */}
                                    <div className="col-span-5 text-white text-left truncate pl-2">
                                        <span className="text-xs md:text-base">{res.period}</span>
                                    </div>

                                    {/* Number - centered in its column */}
                                    <div className="col-span-2 flex justify-center">
                                        <span className={`font-medium text-lg ${COLOR_CLASSES[res.color]}`}>{res.number}</span>
                                    </div>

                                    {/* Big/Small - centered */}
                                    <div className="col-span-3 text-center">
                                        <span className="font-medium text-sm text-white">{res.bigSmall}</span>
                                    </div>

                                    {/* Color - circle only, aligned center */}
                                    <div className="col-span-2 flex justify-center">
                                        <div
                                            className={`w-6 h-6 rounded-full ${res.color === 'green' ? 'bg-green-500' :
                                                res.color === 'red' ? 'bg-red-500' :
                                                    'bg-purple-500'
                                                } border border-gray-300`}
                                            title={COLOR_LABELS[res.color]}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // My Bets Table (API)
                    <div className="w-full">
                        {betsLoading ? (
                            <div className="text-center text-blue-200 py-8">Loading your bets...</div>
                        ) : betsError ? (
                            <div className="text-center text-red-400 py-8">{betsError}</div>
                        ) : apiBets.length === 0 ? (
                            <div className="text-center text-blue-200 py-8">
                                <div className="text-4xl mb-2">🎲</div>
                                <div>No bets found</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {[...apiBets].map((bet, idx) => {
                                    // Map API fields to display fields
                                    const period = bet.period;
                                    const prediction = bet.prediction;
                                    const amount = bet.stake;
                                    const status = bet.status;
                                    const profit = bet.profit;

                                    // Determine color/number/bigSmall for display
                                    let displayType = '';
                                    let displayValue = '';
                                    let colorClass = '';
                                    if (["green", "red", "violet"].includes(prediction)) {
                                        displayType = "color";
                                        displayValue = prediction.charAt(0).toUpperCase();
                                        colorClass =
                                            prediction === "green"
                                                ? "bg-green-500"
                                                : prediction === "red"
                                                    ? "bg-red-500"
                                                    : "bg-purple-500";
                                    } else if (["small", "big"].includes(prediction)) {
                                        displayType = "bigSmall";
                                        displayValue = prediction === "big" ? "B" : "S";
                                        colorClass =
                                            prediction === "big"
                                                ? "bg-blue-500"
                                                : "bg-orange-500";
                                    } else {
                                        // number prediction: "zero", "one", ..., "nine"
                                        displayType = "number";
                                        const numWords = [
                                            "zero",
                                            "one",
                                            "two",
                                            "three",
                                            "four",
                                            "five",
                                            "six",
                                            "seven",
                                            "eight",
                                            "nine",
                                        ];
                                        const numIdx = numWords.indexOf(prediction);
                                        displayValue = numIdx !== -1 ? numIdx : "?";
                                        colorClass =
                                            numIdx !== -1
                                                ? NUMBER_COLORS[numIdx] === "green"
                                                    ? "bg-green-500"
                                                    : NUMBER_COLORS[numIdx] === "red"
                                                        ? "bg-red-500"
                                                        : "bg-purple-500"
                                                : "bg-gray-500";
                                    }

                                    // Find result for this bet
                                    const res = resultHistory.find((r) => r.period === period);

                                    // Use placed_at for date/time display
                                    const placedAt = bet.placed_at;
                                    const dateObj = placedAt ? new Date(placedAt) : null;
                                    const dateStr = dateObj
                                        ? dateObj.toLocaleDateString("en-GB", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                        }).replace(/\//g, "-")
                                        : "";
                                    const timeStr = dateObj
                                        ? dateObj.toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })
                                        : "";

                                    // Amount display logic as per requirements
                                    let amountDisplay = "";
                                    let amountColor = "";
                                    if (status === "open") {
                                        amountDisplay = `-${amount}`;
                                        amountColor = "text-yellow-400";
                                    } else if (status === "settled" && profit === 0.0) {
                                        amountDisplay = `-${amount}`;
                                        amountColor = "text-red-400";
                                    } else if (status === "settled" && profit !== 0.0) {
                                        amountDisplay = `+${profit}`;
                                        amountColor = "text-green-400";
                                    }

                                    return (
                                        <div key={idx} className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-4 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                {/* Left side - Color/Number/BigSmall indicator */}
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-medium text-white text-lg ${colorClass}`}
                                                    >
                                                        {displayValue}
                                                    </div>
                                                    <div className="text-white">
                                                        <div className="font-medium text-lg">{period}</div>
                                                    </div>
                                                </div>
                                                {/* Right side - Status and Amount */}
                                                <div className="flex items-center gap-4">
                                                    {/* Status */}
                                                    <div className="text-center">
                                                        {status === "settled" ? (
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-sm font-medium ${profit > 0
                                                                    ? "bg-green-500 text-white"
                                                                    : "bg-red-500 text-white"
                                                                    }`}
                                                            >

                                                                {profit > 0 ? "Win" : "Fail"}
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500 text-white">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Amount */}
                                                    <div className="text-right">
                                                        <div className={`font-medium text-lg ${amountColor}`}>
                                                            {amountDisplay}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GameBoard;