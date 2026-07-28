'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, RotateCcw, ShieldCheck, Trophy, Wallet, Clock, Star, Sparkles, Crown, Users, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type GameMode = '1v1' | '1v2' | '1v3';

export interface Token {
  id: number; // 0..3
  color: PlayerColor;
  position: number; // -1 = Base, 0..51 = Circuit, 100..104 = Home Stretch, 200 = Finished Home
  stepCount: number; // 0 = Base, 1..52 = Outer, 53..57 = Home Finish
}

// 52 Outer Track Coordinates mapped on 15x15 grid [row (1..15), col (1..15)]
const CIRCUIT_GRID_COORDS: [number, number][] = [
  [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],    // 0..4 (Red Start)
  [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7], // 5..10
  [1, 8], [1, 9],                             // 11..12
  [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],    // 13..17 (Green Start: 13)
  [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15], // 18..23
  [8, 15], [9, 15],                           // 24..25
  [9, 14], [9, 13], [9, 12], [9, 11], [9, 10], // 26..30 (Yellow Start: 26)
  [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], // 31..36
  [15, 8], [15, 7],                           // 37..38
  [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], // 39..43 (Blue Start: 39)
  [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1], // 44..49
  [8, 1], [7, 1],                             // 50..51
];

// Color Home Stretches [row, col]
const HOME_STRETCH_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6]],
  green: [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
  yellow: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10]],
  blue: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8]],
};

const SAFE_INDEXES = [0, 8, 13, 21, 26, 34, 39, 47];
const START_INDEXES: Record<PlayerColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };

const OPPOSITE_COLORS: Record<PlayerColor, PlayerColor> = {
  red: 'yellow',
  yellow: 'red',
  green: 'blue',
  blue: 'green',
};

export default function LudoPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 25;
  const WIN_REWARD = 45;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [userColor, setUserColor] = useState<PlayerColor>('red');
  const [gameMode, setGameMode] = useState<GameMode>('1v1');

  const [tokens, setTokens] = useState<Record<PlayerColor, Token[]>>({
    red: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'red', position: -1, stepCount: 0 })),
    green: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'green', position: -1, stepCount: 0 })),
    yellow: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'yellow', position: -1, stepCount: 0 })),
    blue: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'blue', position: -1, stepCount: 0 })),
  });

  const [currentTurn, setCurrentTurn] = useState<PlayerColor>('red');
  const [opponentName, setOpponentName] = useState<string>('Neha_Star');
  const [diceVal, setDiceVal] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);

  const [travelingTokenId, setTravelingTokenId] = useState<{ color: PlayerColor; id: number } | null>(null);
  const [travelPath, setTravelPath] = useState<[number, number][]>([]);
  const [popupBanner, setPopupBanner] = useState<{ type: 'capture' | 'safe' | 'home'; message: string } | null>(null);
  const [turnTimer, setTurnTimer] = useState<number>(15);

  const turnOrder: PlayerColor[] = gameMode === '1v1'
    ? [userColor, OPPOSITE_COLORS[userColor]]
    : gameMode === '1v2'
    ? [userColor, 'green', 'yellow']
    : ['red', 'green', 'yellow', 'blue'];

  const showToast = (type: 'capture' | 'safe' | 'home', message: string) => {
    setPopupBanner({ type, message });
    setTimeout(() => {
      setPopupBanner(null);
    }, 2500);
  };

  useEffect(() => {
    if (!hasPaidEntry || winner) return;

    const timer = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          nextTurn();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, hasPaidEntry, winner]);

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Ludo match.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setTokens({
      red: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'red', position: -1, stepCount: 0 })),
      green: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'green', position: -1, stepCount: 0 })),
      yellow: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'yellow', position: -1, stepCount: 0 })),
      blue: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'blue', position: -1, stepCount: 0 })),
    });
    setCurrentTurn(userColor);
    setOpponentName(getRandomOpponentName());
    setDiceVal(6);
    setHasRolled(false);
    setIsOpponentThinking(false);
    setConsecutiveSixes(0);
    setWinner(null);
    setTurnTimer(15);
  };

  const getMovableTokens = (color: PlayerColor, dice: number): Token[] => {
    return tokens[color].filter((t) => {
      if (t.position === -1) return dice === 6;
      if (t.position === 200) return false;
      return t.stepCount + dice <= 57;
    });
  };

  // Master Strategic Move Selector for Opponent Players
  const getStrategicOpponentTokenMove = (color: PlayerColor, dice: number, movableTokens: Token[]): Token => {
    // Priority 1: Capture an opponent token!
    for (const tok of movableTokens) {
      if (tok.position !== -1) {
        const nextStep = tok.stepCount + dice;
        if (nextStep < 52) {
          const startIdx = START_INDEXES[color];
          const targetPos = (startIdx + (nextStep - 1)) % 52;
          if (!SAFE_INDEXES.includes(targetPos)) {
            for (const otherColor of turnOrder) {
              if (otherColor !== color) {
                if (tokens[otherColor].some((et) => et.position === targetPos)) {
                  return tok;
                }
              }
            }
          }
        }
      }
    }

    // Priority 2: Finish into Center Home (step 57)
    const homeFinishTok = movableTokens.find((tok) => tok.stepCount + dice === 57);
    if (homeFinishTok) return homeFinishTok;

    // Priority 3: Release token from Base on 6
    if (dice === 6) {
      const baseTok = movableTokens.find((tok) => tok.position === -1);
      if (baseTok) return baseTok;
    }

    // Priority 4: Land on a Safe Star Cell (⭐)
    for (const tok of movableTokens) {
      if (tok.position !== -1) {
        const nextStep = tok.stepCount + dice;
        if (nextStep < 52) {
          const startIdx = START_INDEXES[color];
          const targetPos = (startIdx + (nextStep - 1)) % 52;
          if (SAFE_INDEXES.includes(targetPos)) {
            return tok;
          }
        }
      }
    }

    // Priority 5: Pick the token furthest along the track
    return movableTokens.reduce((prev, curr) => (curr.stepCount > prev.stepCount ? curr : prev), movableTokens[0]);
  };

  useEffect(() => {
    if (!hasPaidEntry || winner) return;

    if (currentTurn !== userColor) {
      setIsOpponentThinking(true);
      const timer = setTimeout(() => {
        opponentAutoPlay();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, hasPaidEntry, winner, userColor]);

  const opponentAutoPlay = () => {
    setIsRolling(true);
    let count = 0;
    const rollInterval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(rollInterval);
        setIsRolling(false);
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(roll);

        const movable = getMovableTokens(currentTurn, roll);
        if (movable.length === 0 && roll !== 6) {
          setIsOpponentThinking(false);
          nextTurn();
        } else if (movable.length > 0) {
          const chosen = getStrategicOpponentTokenMove(currentTurn, roll, movable);
          executeMoveToken(currentTurn, chosen.id, roll, () => {
            setIsOpponentThinking(false);
          });
        } else {
          setIsOpponentThinking(false);
          nextTurn();
        }
      }
    }, 100);
  };

  const rollDice = () => {
    if (isRolling || hasRolled || currentTurn !== userColor || !!winner || isOpponentThinking) return;

    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalRoll);
        setIsRolling(false);
        setHasRolled(true);

        if (finalRoll === 6) {
          const sixes = consecutiveSixes + 1;
          setConsecutiveSixes(sixes);
          if (sixes >= 3) {
            setConsecutiveSixes(0);
            setHasRolled(false);
            nextTurn();
            return;
          }
        } else {
          setConsecutiveSixes(0);
        }

        const movable = getMovableTokens(userColor, finalRoll);
        if (movable.length === 0 && finalRoll !== 6) {
          setTimeout(() => {
            setHasRolled(false);
            nextTurn();
          }, 600);
        }
      }
    }, 100);
  };

  const getTokenCellCoords = (color: PlayerColor, stepCount: number, position: number): [number, number] | null => {
    if (position >= 0 && position < 52) return CIRCUIT_GRID_COORDS[position];
    if (position >= 100 && position <= 104) return HOME_STRETCH_COORDS[color][position - 100];
    return null;
  };

  const executeMoveToken = (color: PlayerColor, tokenId: number, dice: number, onComplete?: () => void) => {
    const playerTokens = tokens[color];
    const targetToken = playerTokens.find((t) => t.id === tokenId);
    if (!targetToken) return;

    setTravelingTokenId({ color, id: tokenId });

    if (targetToken.position === -1) {
      if (dice !== 6) return;
      const newTokens = { ...tokens };
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.position = START_INDEXES[color];
      tok.stepCount = 1;

      setTokens(newTokens);
      setTravelingTokenId(null);
      setHasRolled(false);
      showToast('safe', `⭐ Token Unlocked to Start Cell!`);
      if (onComplete) onComplete();
      return;
    }

    let currentStep = targetToken.stepCount;
    const targetStep = currentStep + dice;
    if (targetStep > 57) return;

    const pathCoords: [number, number][] = [];

    const moveInterval = setInterval(() => {
      currentStep += 1;
      const newTokens = { ...tokens };
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.stepCount = currentStep;

      if (currentStep === 57) {
        tok.position = 200;
        showToast('home', `🏆 Token Reached CENTER HOME!`);
      } else if (currentStep > 51) {
        tok.position = 100 + (currentStep - 52);
      } else {
        const startIdx = START_INDEXES[color];
        tok.position = (startIdx + (currentStep - 1)) % 52;
      }

      const cell = getTokenCellCoords(color, currentStep, tok.position);
      if (cell) pathCoords.push(cell);
      setTravelPath([...pathCoords]);
      setTokens({ ...newTokens });

      if (currentStep >= targetStep) {
        clearInterval(moveInterval);

        let captured = false;
        if (tok.position < 100 && !SAFE_INDEXES.includes(tok.position)) {
          for (const cKey of turnOrder) {
            if (cKey !== color) {
              const enemy = newTokens[cKey].find((t) => t.position === tok.position);
              if (enemy) {
                enemy.position = -1;
                enemy.stepCount = 0;
                captured = true;
                showToast('capture', `⚔️ TOKEN CAPTURED! Extra Turn Granted!`);
                break;
              }
            }
          }
        } else if (tok.position < 100 && SAFE_INDEXES.includes(tok.position)) {
          showToast('safe', `⭐ SAFE ZONE! Token is Protected!`);
        }

        if (newTokens[color].every((t) => t.position === 200)) {
          const winnerName = color === userColor ? (user?.name || 'Player') : opponentName;
          setWinner(winnerName);
          if (color === userColor) {
            updateWalletBalance(WIN_REWARD);
            recordGameMatch('ludo', 'Ludo Star Supreme', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
            confetti({ particleCount: 150, spread: 90 });
          } else {
            recordGameMatch('ludo', 'Ludo Star Supreme', 'LOSS', ENTRY_COST, 0, opponentName);
          }
        }

        setTravelingTokenId(null);
        setTravelPath([]);
        setHasRolled(false);

        const grantExtra = dice === 6 || captured || tok.position === 200;
        if (!grantExtra) {
          nextTurn();
        }

        if (onComplete) onComplete();
      }
    }, 130);
  };

  const handlePlayerTokenClick = (tokenId: number) => {
    if (!hasRolled || currentTurn !== userColor || isRolling || !!winner) return;

    const movable = getMovableTokens(userColor, diceVal);
    if (movable.some((t) => t.id === tokenId)) {
      executeMoveToken(userColor, tokenId, diceVal);
    }
  };

  const nextTurn = () => {
    const curIdx = turnOrder.indexOf(currentTurn);
    const nextCol = turnOrder[(curIdx + 1) % turnOrder.length];
    setCurrentTurn(nextCol);
    setHasRolled(false);
    setTurnTimer(15);
  };

  const renderPhotorealistic3DDice = (value: number) => {
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

  const renderExactTeardropPinMarker = (color: PlayerColor, isSelectable: boolean = false, isTraveling: boolean = false) => {
    const pinHex =
      color === 'red'
        ? '#e11d48'
        : color === 'green'
        ? '#10b981'
        : color === 'yellow'
        ? '#f59e0b'
        : '#0ea5e9';

    return (
      <div className={`relative flex flex-col items-center transition-all transform ${
        isTraveling ? 'scale-125 -translate-y-2 animate-bounce z-30' : ''
      } ${isSelectable ? 'ring-4 ring-amber-300 animate-pulse scale-110 cursor-pointer z-30' : ''}`}>
        <svg
          viewBox="0 0 24 28"
          className="w-6 h-7 sm:w-7 sm:h-8 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 0C5.37 0 0 5.37 0 12C0 19.5 12 28 12 28C12 28 24 19.5 24 12C24 5.37 18.63 0 12 0Z"
            fill={pinHex}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="11" r="5" fill="#ffffff" />
        </svg>
      </div>
    );
  };

  const renderCellTokens = (row: number, col: number) => {
    const presentTokens: Token[] = [];

    Object.values(tokens).forEach((tList) => {
      tList.forEach((t) => {
        if (t.position >= 0 && t.position < 52) {
          const [r, c] = CIRCUIT_GRID_COORDS[t.position];
          if (r === row && c === col) presentTokens.push(t);
        } else if (t.position >= 100 && t.position <= 104) {
          const [r, c] = HOME_STRETCH_COORDS[t.color][t.position - 100];
          if (r === row && c === col) presentTokens.push(t);
        }
      });
    });

    const isTravelPathSq = travelPath.some(([r, c]) => r === row && c === col);

    return (
      <>
        {isTravelPathSq && <div className="absolute inset-0 bg-amber-400/40 animate-pulse pointer-events-none"></div>}

        {presentTokens.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center space-x-0.5 z-20 pointer-events-none">
            {presentTokens.map((t, i) => {
              const isTraveling = travelingTokenId && travelingTokenId.color === t.color && travelingTokenId.id === t.id;
              const movable = hasRolled && currentTurn === userColor && getMovableTokens(userColor, diceVal).some((mt) => mt.id === t.id);

              return (
                <div
                  key={`${t.color}-${t.id}-${i}`}
                  onClick={() => t.color === userColor && handlePlayerTokenClick(t.id)}
                  className="pointer-events-auto"
                >
                  {renderExactTeardropPinMarker(t.color, movable, !!isTraveling)}
                </div>
              );
            })}
          </div>
        )}
      </>
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

        {popupBanner && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-sm border border-amber-400/50 shadow-2xl animate-bounce flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{popupBanner.message}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strategic Minimax & Priority Intelligence</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Ludo Star Supreme
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry: ₹{ENTRY_COST} | Win: ₹{WIN_REWARD}</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">
              
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Select Game Mode & Color!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Challenge intelligent online opponents in 1v1, 1v2, or 1v3 Ludo arenas!
                </p>
              </div>

              {/* Mode Selector */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Match Mode:</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['1v1', '1v2', '1v3'] as GameMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGameMode(mode)}
                      className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition-all flex items-center justify-center space-x-1.5 ${
                        gameMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg scale-105'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{mode === '1v1' ? '1 vs 1 (Cross)' : mode === '1v2' ? '1 vs 2' : '1 vs 3'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Your Color:</p>
                <div className="grid grid-cols-4 gap-3">
                  {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map((color) => (
                    <button
                      key={color}
                      onClick={() => setUserColor(color)}
                      className={`py-3 px-2 rounded-2xl font-black text-xs uppercase border-2 transition-all flex flex-col items-center justify-center space-y-1 ${
                        userColor === color
                          ? 'ring-4 ring-amber-400 scale-105 border-white shadow-xl'
                          : 'opacity-70 hover:opacity-100'
                      } ${
                        color === 'red'
                          ? 'bg-rose-600 text-white'
                          : color === 'green'
                          ? 'bg-emerald-600 text-white'
                          : color === 'yellow'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-sky-500 text-white'
                      }`}
                    >
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹25 & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Board Canvas */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] border-4 border-slate-900 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-15 grid-rows-15 bg-white dark:bg-slate-950 select-none relative">
                  
                  {/* RED BASE */}
                  <div className={`col-span-6 row-span-6 bg-rose-600 p-3 sm:p-5 flex items-center justify-center border-b-2 border-r-2 border-slate-900 transition-all ${
                    currentTurn === 'red' ? 'ring-4 ring-amber-400 shadow-2xl scale-[1.02] z-10' : ''
                  }`}>
                    <div className="w-full h-full bg-white rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                      {tokens.red.map((t) => (
                        <button
                          key={t.id}
                          disabled={t.position !== -1 || currentTurn !== userColor || !hasRolled || diceVal !== 6}
                          onClick={() => userColor === 'red' && handlePlayerTokenClick(t.id)}
                          className="flex items-center justify-center"
                        >
                          {t.position === -1 && renderExactTeardropPinMarker('red', hasRolled && diceVal === 6 && userColor === 'red' && currentTurn === 'red')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* GREEN BASE */}
                  <div className={`col-start-10 col-span-6 row-span-6 bg-emerald-600 p-3 sm:p-5 flex items-center justify-center border-b-2 border-l-2 border-slate-900 transition-all ${
                    currentTurn === 'green' ? 'ring-4 ring-amber-400 shadow-2xl scale-[1.02] z-10' : ''
                  }`}>
                    <div className="w-full h-full bg-white rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                      {tokens.green.map((t) => (
                        <div key={t.id} className="flex items-center justify-center">
                          {t.position === -1 && renderExactTeardropPinMarker('green')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BLUE BASE */}
                  <div className={`row-start-10 col-span-6 row-span-6 bg-sky-500 p-3 sm:p-5 flex items-center justify-center border-t-2 border-r-2 border-slate-900 transition-all ${
                    currentTurn === 'blue' ? 'ring-4 ring-amber-400 shadow-2xl scale-[1.02] z-10' : ''
                  }`}>
                    <div className="w-full h-full bg-white rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                      {tokens.blue.map((t) => (
                        <div key={t.id} className="flex items-center justify-center">
                          {t.position === -1 && renderExactTeardropPinMarker('blue')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* YELLOW BASE */}
                  <div className={`row-start-10 col-start-10 col-span-6 row-span-6 bg-amber-400 p-3 sm:p-5 flex items-center justify-center border-t-2 border-l-2 border-slate-900 transition-all ${
                    currentTurn === 'yellow' ? 'ring-4 ring-amber-400 shadow-2xl scale-[1.02] z-10' : ''
                  }`}>
                    <div className="w-full h-full bg-white rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-inner">
                      {tokens.yellow.map((t) => (
                        <div key={t.id} className="flex items-center justify-center">
                          {t.position === -1 && renderExactTeardropPinMarker('yellow')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CENTER STAR HOME */}
                  <div className="col-start-7 row-start-7 col-span-3 row-span-3 bg-amber-400 p-1 flex flex-col items-center justify-center text-slate-950 font-black text-xs border-2 border-slate-900 shadow-2xl z-10">
                    {winner ? (
                      <div className="flex flex-col items-center animate-bounce">
                        <Crown className="w-7 h-7 text-amber-500 fill-current drop-shadow-md" />
                        <span className="text-[9px] font-black uppercase text-slate-950">WINNER</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-slate-950 animate-bounce" />
                        <span className="text-[10px]">HOME</span>
                      </>
                    )}
                  </div>

                  {/* 15x15 GRID CELLS */}
                  {Array.from({ length: 15 }, (_, r) =>
                    Array.from({ length: 15 }, (_, c) => {
                      const row = r + 1;
                      const col = c + 1;

                      if (
                        (row <= 6 && col <= 6) ||
                        (row <= 6 && col >= 10) ||
                        (row >= 10 && col <= 6) ||
                        (row >= 10 && col >= 10) ||
                        (row >= 7 && row <= 9 && col >= 7 && col <= 9)
                      ) {
                        return null;
                      }

                      const isRedHomeStr = row === 8 && col >= 2 && col <= 6;
                      const isGreenHomeStr = col === 8 && row >= 2 && row <= 6;
                      const isYellowHomeStr = row === 8 && col >= 10 && col <= 14;
                      const isBlueHomeStr = col === 8 && row >= 10 && row <= 14;

                      const isRedStart = row === 7 && col === 2;
                      const isGreenStart = row === 2 && col === 9;
                      const isYellowStart = row === 9 && col === 14;
                      const isBlueStart = row === 14 && col === 7;

                      const isStarCell =
                        (row === 3 && col === 7) ||
                        (row === 13 && col === 9) ||
                        (row === 9 && col === 3) ||
                        (row === 7 && col === 13);

                      return (
                        <div
                          key={`cell-${row}-${col}`}
                          className={`relative border border-slate-300 dark:border-slate-800 flex items-center justify-center font-bold text-[9px] ${
                            isRedHomeStr || isRedStart
                              ? 'bg-rose-600 text-white'
                              : isGreenHomeStr || isGreenStart
                              ? 'bg-emerald-600 text-white'
                              : isYellowHomeStr || isYellowStart
                              ? 'bg-amber-400 text-slate-950'
                              : isBlueHomeStr || isBlueStart
                              ? 'bg-sky-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                          }`}
                          style={{ gridRowStart: row, gridColumnStart: col }}
                        >
                          {isStarCell && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                          {renderCellTokens(row, col)}
                        </div>
                      );
                    })
                  )}

                </div>
              </div>

              {/* Controls Panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6 text-center">
                  
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 animate-bounce">
                      <Crown className="w-8 h-8 text-amber-400 fill-current drop-shadow-md" />
                      <span>{winner} Wins Ludo Match!</span>
                      <span className="text-xs text-emerald-400">+₹{WIN_REWARD} Credited to Wallet!</span>
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{currentTurn.toUpperCase()} player evaluating strategy...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>Turn Player</span>
                        <span>Timer: {turnTimer}s</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                        {currentTurn === userColor ? `Your Turn (${userColor.toUpperCase()})` : `${currentTurn.toUpperCase()} Turn`}
                      </p>
                    </div>
                  )}

                  {/* Slower Photorealistic 3D Dice */}
                  <div className="flex justify-center my-4">
                    {renderPhotorealistic3DDice(diceVal)}
                  </div>

                  <button
                    disabled={isRolling || hasRolled || isOpponentThinking || !!winner || currentTurn !== userColor}
                    onClick={rollDice}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling Dice...' : hasRolled ? 'Select Pin Marker Below' : 'Roll 3D Casino Dice 🎲'}
                  </button>

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹25 Stake)</span>
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
