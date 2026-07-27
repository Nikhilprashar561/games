'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, RotateCcw, ShieldCheck, Target, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CarromCoin {
  id: number;
  type: 'white' | 'black' | 'queen';
  x: number;
  y: number;
  isPocketed: boolean;
}

const INITIAL_COINS: CarromCoin[] = [
  { id: 1, type: 'queen', x: 50, y: 50, isPocketed: false },
  { id: 2, type: 'white', x: 42, y: 50, isPocketed: false },
  { id: 3, type: 'black', x: 58, y: 50, isPocketed: false },
  { id: 4, type: 'white', x: 50, y: 42, isPocketed: false },
  { id: 5, type: 'black', x: 50, y: 58, isPocketed: false },
  { id: 6, type: 'white', x: 44, y: 44, isPocketed: false },
  { id: 7, type: 'black', x: 56, y: 56, isPocketed: false },
];

export default function CarromPage() {
  const [coins, setCoins] = useState<CarromCoin[]>(INITIAL_COINS);
  const [strikerX, setStrikerX] = useState<number>(50);
  const [power, setPower] = useState<number>(50);
  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  const releaseStriker = () => {
    if (isStriking) return;
    setIsStriking(true);

    setTimeout(() => {
      const unpocketed = coins.filter((c) => !c.isPocketed);
      if (unpocketed.length > 0) {
        const targetCoin = unpocketed[Math.floor(Math.random() * unpocketed.length)];
        setCoins((prev) =>
          prev.map((c) => (c.id === targetCoin.id ? { ...c, isPocketed: true } : c))
        );

        const pts = targetCoin.type === 'queen' ? 30 : targetCoin.type === 'white' ? 10 : 5;
        setScore((prev) => prev + pts);

        if (targetCoin.type === 'queen') {
          confetti({ particleCount: 80, spread: 60 });
        }
      }
      setIsStriking(false);
    }, 500);
  };

  const resetBoard = () => {
    setCoins(INITIAL_COINS);
    setScore(0);
    setStrikerX(50);
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

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Skill & Precision</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Pro Carrom Board
              </h1>
            </div>

            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-emerald-500 font-bold text-sm">
              <Trophy className="w-4 h-4" />
              <span>Score: {score} Pts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-[#d9ab7e] border-[16px] border-[#5c3a21] rounded-3xl shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
                
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-slate-950 shadow-inner"></div>
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-950 shadow-inner"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-slate-950 shadow-inner"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-slate-950 shadow-inner"></div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-red-700/60 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full border border-red-600/40"></div>
                </div>

                <div className="absolute bottom-12 left-12 right-12 h-1 bg-red-700/50 flex items-center justify-between">
                  <div className="w-5 h-5 rounded-full bg-red-700 border border-amber-200"></div>
                  <div className="w-5 h-5 rounded-full bg-red-700 border border-amber-200"></div>
                </div>

                {coins.map(
                  (c) =>
                    !c.isPocketed && (
                      <div
                        key={c.id}
                        style={{ top: `${c.y}%`, left: `${c.x}%` }}
                        className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md transition-all duration-300 ${
                          c.type === 'queen'
                            ? 'bg-red-600 ring-2 ring-amber-300'
                            : c.type === 'white'
                            ? 'bg-amber-100 border border-slate-400'
                            : 'bg-slate-900 border border-slate-700'
                        }`}
                      ></div>
                    )
                )}

                <div
                  style={{ bottom: '48px', left: `${strikerX}%` }}
                  className={`absolute w-7 h-7 -translate-x-1/2 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-400 border-2 border-white shadow-xl transition-all duration-150 ${
                    isStriking ? 'animate-ping' : ''
                  }`}
                ></div>

              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6">
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Position Striker: {strikerX}%
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={strikerX}
                    onChange={(e) => setStrikerX(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Shot Power: {power}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={power}
                    onChange={(e) => setPower(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <button
                  onClick={releaseStriker}
                  disabled={isStriking}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Target className="w-5 h-5" />
                  <span>{isStriking ? 'Striking...' : 'Release Striker!'}</span>
                </button>

                <button
                  onClick={resetBoard}
                  className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Carrom Men</span>
                </button>

              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
