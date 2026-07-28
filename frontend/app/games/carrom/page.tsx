'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, ShieldCheck, Trophy, Wallet, RotateCcw, Target, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

export default function CarromPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 20;
  const WIN_REWARD = 36;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [opponentName, setOpponentName] = useState<string>('Rahul_Carrom');
  const [strikerPos, setStrikerPos] = useState<number>(50);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(75);
  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [winner, setWinner] = useState<string | null>(null);

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Carrom arena.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setPlayerScore(0);
    setOpponentScore(0);
    setOpponentName(getRandomOpponentName());
    setStrikerPos(50);
    setAimAngle(0);
    setPower(75);
    setTurn('player');
    setIsOpponentThinking(false);
    setWinner(null);
  };

  const handleStrike = async () => {
    if (isStriking || isOpponentThinking || winner || turn !== 'player') return;

    setIsStriking(true);
    setTimeout(async () => {
      setIsStriking(false);
      const points = Math.random() < 0.70 ? 10 : 0;
      const newPlayerScore = playerScore + points;
      setPlayerScore(newPlayerScore);

      if (newPlayerScore >= 50) {
        const winnerName = user?.name || 'Player';
        setWinner(winnerName);
        await updateWalletBalance(WIN_REWARD);
        await recordGameMatch('carrom', 'Pro Carrom Board', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
        confetti({ particleCount: 120, spread: 80 });
        return;
      }

      // Trigger Opponent Turn with realistic latency
      setTurn('opponent');
      triggerOpponentTurn();
    }, 700);
  };

  const triggerOpponentTurn = () => {
    setIsOpponentThinking(true);
    setTimeout(async () => {
      setIsOpponentThinking(false);
      const oppPoints = Math.random() < 0.60 ? 10 : 0;
      const newOppScore = opponentScore + oppPoints;
      setOpponentScore(newOppScore);

      if (newOppScore >= 50) {
        setWinner(opponentName);
        await recordGameMatch('carrom', 'Pro Carrom Board', 'LOSS', ENTRY_COST, 0, opponentName);
        return;
      }

      setTurn('player');
    }, 1900); // 1.9s thinking delay
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
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Classic Striker Board</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Pro Carrom Arena
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
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 to-emerald-500 text-white flex items-center justify-center shadow-xl">
                <Target className="w-10 h-10 animate-bounce" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">First to 50 Points Wins!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹20 entry to play against live opponent <span className="font-bold text-emerald-500">{opponentName}</span>. Pocket carrom men to win ₹36!
                </p>
              </div>
              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all"
              >
                Pay ₹20 & Play Carrom!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Carrom Board Graphical View */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-3xl bg-[#d4a373] border-8 border-[#6b4226] shadow-2xl relative flex items-center justify-center overflow-hidden">
                  
                  {/* 4 Corner Pockets */}
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-950 border-2 border-[#6b4226] shadow-inner"></div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-950 border-2 border-[#6b4226] shadow-inner"></div>
                  <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-slate-950 border-2 border-[#6b4226] shadow-inner"></div>
                  <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-slate-950 border-2 border-[#6b4226] shadow-inner"></div>

                  {/* Center Circle & Red Queen */}
                  <div className="w-16 h-16 rounded-full border-2 border-red-700 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-rose-600 border border-white shadow-md"></div>
                  </div>

                  {/* Aim Line Trajectory */}
                  <div
                    className="absolute bottom-10 w-0.5 h-32 bg-amber-300/80 origin-bottom transition-transform pointer-events-none"
                    style={{
                      left: `${strikerPos}%`,
                      transform: `rotate(${aimAngle}deg)`,
                    }}
                  ></div>

                  {/* Striker Circle */}
                  <div
                    className="absolute bottom-8 w-7 h-7 rounded-full bg-amber-300 border-2 border-slate-900 shadow-xl transition-all duration-300 flex items-center justify-center font-bold text-[10px]"
                    style={{ left: `${strikerPos}%` }}
                  >
                    🎯
                  </div>

                </div>
              </div>

              {/* Striker Controls & Scoreboard */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6">
                  
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base text-center animate-bounce">
                      <Trophy className="w-6 h-6 mx-auto mb-1" />
                      <span>{winner} Wins Carrom Match!</span>
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} aiming striker...</span>
                    </div>
                  ) : (
                    <div className="space-y-3 font-['Space_Grotesk'] text-center">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <p className="text-xs font-bold text-slate-400">YOUR SCORE ({user?.name})</p>
                        <p className="text-2xl font-black text-emerald-500">{playerScore} / 50</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <p className="text-xs font-bold text-slate-400">OPPONENT SCORE ({opponentName})</p>
                        <p className="text-2xl font-black text-amber-500">{opponentScore} / 50</p>
                      </div>
                    </div>
                  )}

                  {/* Striker Position Slider */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Striker Position</label>
                    <input
                      type="range"
                      min="15"
                      max="85"
                      value={strikerPos}
                      onChange={(e) => setStrikerPos(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Striker Aim Angle */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Aim Angle (-45° to +45°)</label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={aimAngle}
                      onChange={(e) => setAimAngle(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Strike Button */}
                  <button
                    disabled={isStriking || isOpponentThinking || !!winner || turn !== 'player'}
                    onClick={handleStrike}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isStriking ? 'Striking...' : 'Release Striker 🎯'}
                  </button>

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹20 Stake)</span>
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
