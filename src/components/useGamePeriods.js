import {
    useEffect,
    useRef,
    useState
} from 'react';

// Helper to parse period string as UTC date
function parsePeriodToUTCDate(period) {
    const year = period.slice(0, 4);
    const month = period.slice(4, 6);
    const day = period.slice(6, 8);
    const hour = period.slice(8, 10);
    const min = period.slice(10, 12);
    const sec = period.slice(12, 14);
    return new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(min),
        Number(sec)
    ));
}

// Helper to get color and big/small from number
export function getColorAndBigSmall(number) {
    let color = '';
    if (number === 0 || number === 5) color = 'violet';
    else if (number % 2 === 1) color = 'green';
    else color = 'red';
    const bigSmall = number < 5 ? 'Small' : 'Big';
    return {
        color,
        bigSmall
    };
}

export const TYPE_MAP = {
    'Win Go 30Sec': '30S',
    'Win Go 1Min': '1M',
    'Win Go 3Min': '3M',
    'Win Go 5Min': '5M',
};

export const GAME_TYPES = [{
        label: 'Win Go 30Sec',
        duration: 30
    },
    {
        label: 'Win Go 1Min',
        duration: 60
    },
    {
        label: 'Win Go 3Min',
        duration: 180
    },
    {
        label: 'Win Go 5Min',
        duration: 300
    },
];

export default function useGamePeriods() {
    const [periods, setPeriods] = useState({
        '30S': {
            period: '',
            endTime: null,
            timeLeft: 0,
            result: null
        },
        '1M': {
            period: '',
            endTime: null,
            timeLeft: 0,
            result: null
        },
        '3M': {
            period: '',
            endTime: null,
            timeLeft: 0,
            result: null
        },
        '5M': {
            period: '',
            endTime: null,
            timeLeft: 0,
            result: null
        },
    });
    const [wsReady, setWsReady] = useState(false);
    const timerRefs = useRef({});

    useEffect(() => {
        const ws = new WebSocket('wss://color-prediction-742i.onrender.com/ws');
        ws.onopen = () => setWsReady(true);

        ws.onmessage = (event) => {
            const msg = event.data.trim();

            // Period message
            const periodMatch = msg.match(/^(\d{14}) (30S|1M|3M|5M) (\d{4}-\d{2}-\d{2}.+)$/);
            if (periodMatch) {
                const [, periodStr, type_] = periodMatch;
                const periodEndTime = parsePeriodToUTCDate(periodStr);
                const duration = GAME_TYPES.find(g => TYPE_MAP[g.label] === type_).duration;

                setPeriods(prev => {
                    if (timerRefs.current[type_]) clearInterval(timerRefs.current[type_]);
                    const now = new Date();
                    let diff = Math.floor((periodEndTime - now) / 1000);
                    let timeLeft = ((diff % duration) + duration) % duration;
                    timerRefs.current[type_] = setInterval(() => {
                        setPeriods(p => {
                            const nowTick = new Date();
                            let diffTick = Math.floor((periodEndTime - nowTick) / 1000);
                            let timeLeftTick = ((diffTick % duration) + duration) % duration;
                            return {
                                ...p,
                                [type_]: {
                                    ...p[type_],
                                    timeLeft: timeLeftTick
                                }
                            };
                        });
                    }, 1000);

                    return {
                        ...prev,
                        [type_]: {
                            ...prev[type_],
                            period: periodStr,
                            timeLeft,
                            result: null
                        }
                    };
                });
                return;
            }

            // Result message
            // ...existing code...

            // Result message
            const resultMatch = msg.match(/^(\d{14}) (30S|1M|3M|5M) (\d+) ([\d\-:.\s]+)$/);
            if (resultMatch) {
                const [, periodStr, type_, numberStr, resultDateStr] = resultMatch;
                const number = parseInt(numberStr, 10);
                const {
                    color,
                    bigSmall
                } = getColorAndBigSmall(number);

                // Parse resultDateStr to a JS Date object
                // Example: "2025-07-02 14:21:54.363636"
                // Replace space with 'T' for ISO format, ignore microseconds
                const isoDateStr = resultDateStr.replace(' ', 'T').split('.')[0];
                const resultDate = new Date(isoDateStr);

                const result = {
                    period: periodStr,
                    number,
                    color,
                    bigSmall,
                    resultDate
                };

                setPeriods(prev => ({
                    ...prev,
                    [type_]: {
                        ...prev[type_],
                        result
                    }
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

    return {
        periods,
        wsReady
    };
}