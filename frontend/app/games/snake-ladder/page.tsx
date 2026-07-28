'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Dices, RotateCcw, ShieldCheck, Trophy, Wallet, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

const SNAKES: Record<number, number> = {
  98: 78,
  95: 56,
  92: 51,
  83: 19,
  73: 1,
  69: 33,
  64: 36,
  59: 17,
  52: 11,
  48: 9,
};

const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

export default function SnakeLadderPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 10;
  const WIN_REWARD = 18;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [playerPos, setPlayerPos] = useState<number>(1);
  const [opponentPos, setOpponentPos] = useState<number>(1);
  const [opponentName, setOpponentName] = useState<string>('Rohan_Pro');
  const [diceVal, setDiceVal] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [winner, setWinner] = useState<string | null>(null);

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Snake & Ladder match.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setPlayerPos(1);
    setOpponentPos(1);
    setOpponentName(getRandomOpponentName());
    setTurn('player');
    setWinner(null);
  };

  // Step-by-step animated movement function (1 -> 2 -> 3 -> 4 -> 5)
  const animateStepMovement = (startPos: number, steps: number, isPlayer: boolean, callback: (finalPos: number) => void) => {
    let current = startPos;
    let target = startPos + steps;
    if (target > 100) target = startPos;

    if (current === target) {
      callback(current);
      return;
    }

    const interval = setInterval(() => {
      current += 1;
      if (isPlayer) setPlayerPos(current);
      else setOpponentPos(current);

      if (current >= target) {
        clearInterval(interval);
        let finalPos = target;
        if (SNAKES[finalPos]) finalPos = SNAKES[finalPos];
        else if (LADDERS[finalPos]) finalPos = LADDERS[finalPos];

        setTimeout(() => {
          if (isPlayer) setPlayerPos(finalPos);
          else setOpponentPos(finalPos);
          callback(finalPos);
        }, 300);
      }
    }, 160); // 160ms step delay for smooth visual progression
  };

  const rollDice = async () => {
    if (isRolling || winner || turn !== 'player' || isOpponentThinking) return;

    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setIsRolling(false);

        // Execute Step-by-Step Player Movement
        animateStepMovement(playerPos, finalVal, true, async (finalPos) => {
          if (finalPos === 100) {
            const winnerName = user?.name || 'Player';
            setWinner(winnerName);
            await updateWalletBalance(WIN_REWARD);
            await recordGameMatch('snake-ladder', 'Snake & Ladder', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
            confetti({ particleCount: 120, spread: 80 });
            return;
          }

          setTurn('opponent');
          triggerOpponentTurn();
        });
      }
    }, 50);
  };

  const triggerOpponentTurn = () => {
    setIsOpponentThinking(true);
    setTimeout(() => {
      let count = 0;
      const interval = setInterval(() => {
        setDiceVal(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count >= 10) {
          clearInterval(interval);
          const oppRoll = Math.floor(Math.random() * 6) + 1;
          setDiceVal(oppRoll);

          animateStepMovement(opponentPos, oppRoll, false, async (finalPos) => {
            setIsOpponentThinking(false);
            if (finalPos === 100) {
              setWinner(opponentName);
              await recordGameMatch('snake-ladder', 'Snake & Ladder', 'LOSS', ENTRY_COST, 0, opponentName);
              return;
            }
            setTurn('player');
          });
        }
      }, 50);
    }, 1800); // 1.8s thinking delay
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Real Money Stake Arena</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Snake & Ladder Supreme
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
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl">
                <Dices className="w-10 h-10 animate-bounce" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Race to Cell 100!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹10 entry to challenge online player <span className="font-bold text-emerald-500">{opponentName}</span>. First to reach 100 wins ₹18!
                </p>
              </div>
              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all"
              >
                Pay ₹10 & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 10x10 Board Grid */}
              <div className="lg:col-span-8 flex flex-col items-center">
                
                {/* Marker Legend Header */}
                <div className="w-full max-w-[420px] flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md"></div>
                    <span className="font-extrabold text-xs text-rose-500">You (Red Token): Cell #{playerPos}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-md"></div>
                    <span className="font-extrabold text-xs text-sky-500">{opponentName} (Blue): Cell #{opponentPos}</span>
                  </div>
                </div>

                <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] grid grid-cols-10 grid-rows-10 border-4 border-slate-800 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
                  {Array.from({ length: 100 }, (_, i) => {
                    const row = Math.floor(i / 10);
                    const col = i % 10;
                    const isEvenRow = row % 2 === 0;
                    const cellNum = isEvenRow ? 100 - (row * 10 + col) : 100 - (row * 10 + (9 - col));

                    const hasPlayer = playerPos === cellNum;
                    const hasOpponent = opponentPos === cellNum;
                    const isSnake = !!SNAKES[cellNum];
                    const isLadder = !!LADDERS[cellNum];

                    return (
                      <div
                        key={cellNum}
                        className={`relative border border-slate-800/80 flex items-center justify-center text-[10px] sm:text-xs font-black ${
                          (row + col) % 2 === 0 ? 'bg-slate-900 text-slate-500' : 'bg-slate-850 text-slate-600'
                        }`}
                      >
                        <span className="opacity-40">{cellNum}</span>

                        {isSnake && <span className="absolute text-rose-500 text-xs font-extrabold">🐍</span>}
                        {isLadder && <span className="absolute text-emerald-400 text-xs font-extrabold">🪜</span>}

                        {/* Distinct Player Markers with Floating Name Tag */}
                        <div className="absolute inset-0 flex items-center justify-center space-x-1 z-10">
                          {hasPlayer && (
                            <div className="relative group">
                              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 border-2 border-white shadow-lg animate-bounce flex items-center justify-center text-[9px] font-black text-white">
                                Y
                              </div>
                            </div>
                          )}
                          {hasOpponent && (
                            <div className="relative group">
                              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-sky-500 border-2 border-white shadow-lg animate-bounce flex items-center justify-center text-[9px] font-black text-white">
                                O
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controls */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6 text-center">
                  
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base animate-bounce">
                      <Trophy className="w-6 h-6 mx-auto mb-1" />
                      <span>{winner} Wins Match!</span>
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} rolling dice...</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Current Turn</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk'] mt-1">
                        {turn === 'player' ? 'Your Turn (Red Token)' : `${opponentName}'s Turn`}
                      </p>
                    </div>
                  )}

                  {/* Animated 3D Dice */}
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-900 text-white font-black text-4xl flex items-center justify-center border-2 border-emerald-500/40 shadow-2xl">
                    {diceVal}
                  </div>

                  <button
                    disabled={isRolling || isOpponentThinking || !!winner || turn !== 'player'}
                    onClick={rollDice}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
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
