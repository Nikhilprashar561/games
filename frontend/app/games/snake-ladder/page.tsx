'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, RotateCcw, ShieldCheck, Trophy, Wallet, Clock, Volume2, VolumeX, Users, Copy, Check, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

// Snakes & Ladders Map (Industry Standard 100-cell Boustrophedon Board)
const LADDERS_MAP: Record<number, number> = {
  4: 14,
  9: 31,
  19: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

const SNAKES_MAP: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

// 100-cell Boustrophedon Grid Coordinates [row (1..10), col (1..10)]
// Row 1 (Bottom, cells 1..10): Left -> Right
// Row 2 (cells 11..20): Right -> Left
// Row 3 (cells 21..30): Left -> Right ... Boustrophedon Flow!
const getCellCoords = (cellNum: number): [number, number] => {
  if (cellNum < 1 || cellNum > 100) return [10, 1];
  const rowFromBottom = Math.floor((cellNum - 1) / 10);
  const row = 10 - rowFromBottom; // 1 at top, 10 at bottom
  const isRightToLeft = rowFromBottom % 2 === 1;
  const colInRow = (cellNum - 1) % 10;
  const col = isRightToLeft ? 10 - colInRow : colInRow + 1;
  return [row, col];
};

export default function SnakeLadderPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 10;
  const WIN_REWARD = 18;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('SNAKE-8842');
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);

  const [playerPos, setPlayerPos] = useState<number>(1);
  const [opponentPos, setOpponentPos] = useState<number>(1);
  const [opponentName, setOpponentName] = useState<string>('Amit_Roy');

  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [diceVal, setDiceVal] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [eventBanner, setEventBanner] = useState<{ type: 'snake' | 'ladder' | 'win'; message: string } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [travelingPlayer, setTravelingPlayer] = useState<'player' | 'opponent' | null>(null);

  // Sound Synthesizer
  const playSound = (type: 'roll' | 'step' | 'ladder' | 'snake' | 'win') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'ladder') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'snake') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Snake & Ladder.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setPlayerPos(1);
    setOpponentPos(1);
    setOpponentName(getRandomOpponentName());
    setDiceVal(6);
    setTurn('player');
    setIsOpponentThinking(false);
    setWinner(null);
    setEventBanner(null);
    setTravelingPlayer(null);
  };

  useEffect(() => {
    if (!hasPaidEntry || winner) return;

    if (turn === 'opponent') {
      setIsOpponentThinking(true);
      const timer = setTimeout(() => {
        opponentAutoTurn();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [turn, hasPaidEntry, winner]);

  const opponentAutoTurn = () => {
    setIsRolling(true);
    playSound('roll');
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalRoll);
        setIsRolling(false);
        processOpponentStep(finalRoll);
      }
    }, 100);
  };

  // Step-by-Step Boustrophedon Movement Flow
  const processOpponentStep = (roll: number) => {
    const startCell = opponentPos;
    const targetCell = startCell + roll;

    if (targetCell > 100) {
      setIsOpponentThinking(false);
      setTurn('player');
      return;
    }

    setTravelingPlayer('opponent');
    let cur = startCell;
    const stepTimer = setInterval(() => {
      cur += 1;
      setOpponentPos(cur);
      playSound('step');

      if (cur >= targetCell) {
        clearInterval(stepTimer);
        setTravelingPlayer(null);

        if (LADDERS_MAP[targetCell]) {
          const ladderTop = LADDERS_MAP[targetCell];
          playSound('ladder');
          setEventBanner({ type: 'ladder', message: `${opponentName} climbed a Ladder to cell ${ladderTop}! 🪜` });
          setTimeout(() => {
            setOpponentPos(ladderTop);
            setEventBanner(null);
            checkOpponentWin(ladderTop);
          }, 900);
        } else if (SNAKES_MAP[targetCell]) {
          const snakeTail = SNAKES_MAP[targetCell];
          playSound('snake');
          setEventBanner({ type: 'snake', message: `${opponentName} got bitten by a Snake to cell ${snakeTail}! 🐍` });
          setTimeout(() => {
            setOpponentPos(snakeTail);
            setEventBanner(null);
            checkOpponentWin(snakeTail);
          }, 900);
        } else {
          checkOpponentWin(targetCell);
        }
      }
    }, 300);
  };

  const checkOpponentWin = (finalPos: number) => {
    setIsOpponentThinking(false);
    if (finalPos === 100) {
      setWinner(opponentName);
      playSound('win');
      recordGameMatch('snake-ladder', 'Snake & Ladder Supreme', 'LOSS', ENTRY_COST, 0, opponentName);
    } else {
      setTurn('player');
    }
  };

  const rollDice = () => {
    if (isRolling || isOpponentThinking || turn !== 'player' || !!winner) return;

    setIsRolling(true);
    playSound('roll');
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalRoll);
        setIsRolling(false);
        processPlayerStep(finalRoll);
      }
    }, 100);
  };

  // Step-by-Step Boustrophedon Movement Flow
  const processPlayerStep = (roll: number) => {
    const startCell = playerPos;
    const targetCell = startCell + roll;

    if (targetCell > 100) {
      setTurn('opponent');
      return;
    }

    setTravelingPlayer('player');
    let cur = startCell;
    const stepTimer = setInterval(() => {
      cur += 1;
      setPlayerPos(cur);
      playSound('step');

      if (cur >= targetCell) {
        clearInterval(stepTimer);
        setTravelingPlayer(null);

        if (LADDERS_MAP[targetCell]) {
          const ladderTop = LADDERS_MAP[targetCell];
          playSound('ladder');
          setEventBanner({ type: 'ladder', message: `GREAT MOVE! Climbed a Ladder to cell ${ladderTop}! 🪜` });
          setTimeout(() => {
            setPlayerPos(ladderTop);
            setEventBanner(null);
            checkPlayerWin(ladderTop);
          }, 900);
        } else if (SNAKES_MAP[targetCell]) {
          const snakeTail = SNAKES_MAP[targetCell];
          playSound('snake');
          setEventBanner({ type: 'snake', message: `OOPS! Bitten by a Snake to cell ${snakeTail}! 🐍` });
          setTimeout(() => {
            setPlayerPos(snakeTail);
            setEventBanner(null);
            checkPlayerWin(snakeTail);
          }, 900);
        } else {
          checkPlayerWin(targetCell);
        }
      }
    }, 300);
  };

  const checkPlayerWin = async (finalPos: number) => {
    if (finalPos === 100) {
      const winnerName = user?.name || 'Player';
      setWinner(winnerName);
      playSound('win');
      await updateWalletBalance(WIN_REWARD);
      await recordGameMatch('snake-ladder', 'Snake & Ladder Supreme', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
      confetti({ particleCount: 150, spread: 90 });
    } else {
      setTurn('opponent');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedRoomCode(true);
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  const render3DCasinoDice = (value: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['col-start-2 row-start-2'],
      2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
      3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
      4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    };

    return (
      <div
        className={`relative w-24 h-24 rounded-[26px] bg-gradient-to-br from-white via-slate-100 to-slate-300 border-4 border-slate-300 shadow-[0_15px_30px_rgba(0,0,0,0.4)] p-3 grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center transition-all transform duration-500 ${
          isRolling ? 'rotate-[720deg] scale-110 animate-spin' : 'hover:scale-105'
        }`}
        style={{
          transform: isRolling
            ? 'rotateX(720deg) rotateY(720deg) scale(1.1)'
            : 'perspective(600px) rotateX(12deg) rotateY(-12deg)',
        }}
      >
        {(dotPositions[value] || dotPositions[6]).map((posClass, idx) => (
          <div
            key={idx}
            className={`w-4 h-4 rounded-full bg-slate-950 shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)] ${posClass}`}
          ></div>
        ))}
      </div>
    );
  };

  // Industry Standard Sleek Wooden Ladder (Dark rails + Golden rungs)
  const renderSVGLadder = (startCell: number, endCell: number, key: string) => {
    const [r1, c1] = getCellCoords(startCell);
    const [r2, c2] = getCellCoords(endCell);

    const x1 = (c1 - 0.5) * 10;
    const y1 = (r1 - 0.5) * 10;
    const x2 = (c2 - 0.5) * 10;
    const y2 = (r2 - 0.5) * 10;

    const numRungs = 6;
    const rungs = Array.from({ length: numRungs }, (_, i) => {
      const t = (i + 1) / (numRungs + 1);
      return {
        rx: x1 + (x2 - x1) * t,
        ry: y1 + (y2 - y1) * t,
      };
    });

    return (
      <g key={key}>
        <line x1={x1 - 1.2} y1={y1} x2={x2 - 1.2} y2={y2} stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        <line x1={x1 + 1.2} y1={y1} x2={x2 + 1.2} y2={y2} stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        {rungs.map((r, idx) => (
          <line key={idx} x1={r.rx - 2.2} y1={r.ry} x2={r.rx + 2.2} y2={r.ry} stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        ))}
      </g>
    );
  };

  // Industry Standard Snake (Tapered emerald cobra with yellow belly stripes & cobra head)
  const renderSVGSnake = (headCell: number, tailCell: number, key: string) => {
    const [r1, c1] = getCellCoords(headCell);
    const [r2, c2] = getCellCoords(tailCell);

    const x1 = (c1 - 0.5) * 10;
    const y1 = (r1 - 0.5) * 10;
    const x2 = (c2 - 0.5) * 10;
    const y2 = (r2 - 0.5) * 10;

    const midX = (x1 + x2) / 2 + (c1 > c2 ? 10 : -10);
    const midY = (y1 + y2) / 2;

    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

    return (
      <g key={key}>
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" strokeLinecap="round" transform="translate(0.4, 0.6)" />
        <path d={pathD} fill="none" stroke="#065f46" strokeWidth="3" strokeLinecap="round" />
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
        <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2" />
        <circle cx={x1} cy={y1} r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.5" />
        <circle cx={x1 - 0.5} cy={y1 - 0.4} r="0.5" fill="#ffffff" />
        <circle cx={x1 - 0.5} cy={y1 - 0.4} r="0.25" fill="#000000" />
      </g>
    );
  };

  // Top Overlay Pin Marker Positioned Centered Above Each Tile Box
  const renderTopOverlayPinMarker = (cellNum: number, color: 'red' | 'blue', name: string, isTraveling: boolean) => {
    const [row, col] = getCellCoords(cellNum);
    const pinHex = color === 'red' ? '#e11d48' : '#0ea5e9';

    const leftPercent = (col - 0.5) * 10;
    const topPercent = (row - 0.5) * 10;

    return (
      <div
        key={`marker-${color}`}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 z-50 ${
          isTraveling ? 'scale-125 -translate-y-4 animate-bounce' : ''
        }`}
        style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
      >
        {/* Floating Tooltip Name Badge */}
        <div className="mb-0.5 px-2 py-0.5 rounded-full bg-slate-950/90 text-white font-black text-[9px] whitespace-nowrap border border-amber-400 shadow-xl">
          {name}
        </div>

        {/* Location Pin Marker */}
        <svg
          viewBox="0 0 24 28"
          className="w-7 h-8 sm:w-8 sm:h-9 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 0C5.37 0 0 5.37 0 12C0 19.5 12 28 12 28C12 28 24 19.5 24 12C24 5.37 18.63 0 12 0Z"
            fill={pinHex}
            stroke="#ffffff"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="11" r="5" fill="#ffffff" />
        </svg>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        {eventBanner && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-sm border border-amber-400/50 shadow-2xl animate-bounce flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{eventBanner.message}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Boustrophedon Flow & Industry Standard Board</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Snake & Ladder Supreme
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry: ₹{ENTRY_COST} | Win: ₹{WIN_REWARD}</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 text-white flex items-center justify-center shadow-xl">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Race to Cell 100!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹10 entry to challenge online player <span className="font-bold text-emerald-500">{opponentName}</span>. First to reach cell 100 wins ₹18!
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 max-w-xs mx-auto p-2 rounded-2xl bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Room Code: {roomCode}</span>
                <button onClick={copyRoomCode} className="ml-2 text-emerald-500 hover:text-emerald-400">
                  {copiedRoomCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹10 & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* RESTORED PREVIOUS BOARD SIZE (w-[320px] h-[320px] sm:w-[460px] sm:h-[460px]) */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="relative w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] border-4 border-slate-900 rounded-3xl shadow-2xl bg-slate-950 select-none">
                  
                  {/* LAYER 1: CLEAN 100-TILE BOARD GRID (z-0) */}
                  <div className="w-full h-full grid grid-cols-10 grid-rows-10 rounded-3xl overflow-hidden">
                    {Array.from({ length: 100 }, (_, i) => {
                      const cellNum = 100 - i;
                      const [row, col] = getCellCoords(cellNum);

                      const colorIndex = (row + col) % 4;
                      const tileBg =
                        colorIndex === 0
                          ? 'bg-amber-400 text-slate-950'
                          : colorIndex === 1
                          ? 'bg-rose-600 text-white'
                          : colorIndex === 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-500 text-white';

                      return (
                        <div
                          key={cellNum}
                          className={`relative border border-slate-900/60 flex flex-col items-center justify-between p-1 font-extrabold text-[10px] sm:text-xs ${tileBg}`}
                          style={{ gridRowStart: row, gridColumnStart: col }}
                        >
                          <span className="self-start text-[9px] font-black opacity-80">{cellNum}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* LAYER 2: VISUAL SVG OVERLAY CANVAS FOR SNAKES & LADDERS (z-10) */}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    {/* Render Industry Standard Wooden Ladders */}
                    {Object.entries(LADDERS_MAP).map(([start, end]) =>
                      renderSVGLadder(Number(start), Number(end), `ladder-${start}`)
                    )}

                    {/* Render Industry Standard Cobra Snakes */}
                    {Object.entries(SNAKES_MAP).map(([head, tail]) =>
                      renderSVGSnake(Number(head), Number(tail), `snake-${head}`)
                    )}
                  </svg>

                  {/* LAYER 3: TOP-LEVEL PIN MARKERS POSITIONED CENTERED ABOVE TILES (z-50) */}
                  <div className="absolute inset-0 w-full h-full pointer-events-none z-50">
                    {renderTopOverlayPinMarker(playerPos, 'red', user?.name || 'You', travelingPlayer === 'player')}
                    {renderTopOverlayPinMarker(opponentPos, 'blue', opponentName, travelingPlayer === 'opponent')}
                  </div>

                </div>
              </div>

              {/* Controls & 3D Casino Dice */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6 text-center">
                  
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 animate-bounce">
                      <Trophy className="w-8 h-8 text-amber-400 fill-current drop-shadow-md" />
                      <span>{winner} Reached Cell 100!</span>
                      {winner !== opponentName ? (
                        <span className="text-xs text-emerald-400">+₹{WIN_REWARD} Credited to Wallet!</span>
                      ) : (
                        <span className="text-xs text-rose-400">Better luck next match!</span>
                      )}
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} rolling 3D dice...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>Turn State</span>
                        <span className="text-emerald-500">Live Room</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                        {turn === 'player' ? `Your Turn (${user?.name || 'You'})` : `${opponentName}'s Turn`}
                      </p>
                    </div>
                  )}

                  {/* 3D Casino White Dice */}
                  <div className="flex justify-center my-4">
                    {render3DCasinoDice(diceVal)}
                  </div>

                  <button
                    disabled={isRolling || isOpponentThinking || !!winner || turn !== 'player'}
                    onClick={rollDice}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling 3D Dice...' : 'Roll 3D Dice 🎲'}
                  </button>

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹10 Stake)</span>
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
