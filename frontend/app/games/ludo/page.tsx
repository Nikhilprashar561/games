'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Dices, RotateCcw, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LudoPage() {
  const [currentTurn, setCurrentTurn] = useState<'red' | 'green' | 'yellow' | 'blue'>('red');
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [, setTokens] = useState({
    red: [0, 0, 0, 0],
    green: [0, 0, 0, 0],
    yellow: [0, 0, 0, 0],
    blue: [0, 0, 0, 0],
  });

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDice(rolled);

      setTokens((prev) => {
        const active = [...prev[currentTurn]];
        active[0] = Math.min(57, active[0] + rolled);
        if (active[0] === 57) {
          confetti({ particleCount: 100, spread: 70 });
        }
        return { ...prev, [currentTurn]: active };
      });

      setIsRolling(false);
      const turns: Array<'red' | 'green' | 'yellow' | 'blue'> = ['red', 'green', 'yellow', 'blue'];
      const nextIdx = (turns.indexOf(currentTurn) + 1) % 4;
      setCurrentTurn(turns[nextIdx]);
    }, 400);
  };

  const resetLudo = () => {
    setTokens({ red: [0, 0, 0, 0], green: [0, 0, 0, 0], yellow: [0, 0, 0, 0], blue: [0, 0, 0, 0] });
    setCurrentTurn('red');
    setDice(null);
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
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>4-Player Board</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Ludo Star Supreme
              </h1>
            </div>

            <button
              onClick={resetLudo}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Board</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-white dark:bg-slate-900 border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-3 grid-rows-3">
                
                <div className="bg-rose-600 p-4 flex items-center justify-center">
                  <div className="w-full h-full bg-white/90 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-full bg-rose-600 border-2 border-white shadow-md"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-1 grid grid-cols-3 grid-rows-6 gap-0.5 border-x-2 border-slate-300 dark:border-slate-700">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm ${
                        idx === 7 || idx === 10 || idx === 13 || idx === 16 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    ></div>
                  ))}
                </div>

                <div className="bg-emerald-600 p-4 flex items-center justify-center">
                  <div className="w-full h-full bg-white/90 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-full bg-emerald-600 border-2 border-white shadow-md"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-1 grid grid-cols-6 grid-rows-3 gap-0.5 border-y-2 border-slate-300 dark:border-slate-700">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm ${
                        idx >= 7 && idx <= 11 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    ></div>
                  ))}
                </div>

                <div className="bg-gradient-to-tr from-rose-600 via-amber-500 to-emerald-600 flex items-center justify-center p-2 text-white font-extrabold text-xs shadow-inner">
                  HOME
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-1 grid grid-cols-6 grid-rows-3 gap-0.5 border-y-2 border-slate-300 dark:border-slate-700">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm ${
                        idx >= 6 && idx <= 10 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    ></div>
                  ))}
                </div>

                <div className="bg-cyan-600 p-4 flex items-center justify-center">
                  <div className="w-full h-full bg-white/90 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-full bg-cyan-600 border-2 border-white shadow-md"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-1 grid grid-cols-3 grid-rows-6 gap-0.5 border-x-2 border-slate-300 dark:border-slate-700">
                  {Array.from({ length: 18 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm ${
                        idx === 1 || idx === 4 || idx === 7 || idx === 10 ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    ></div>
                  ))}
                </div>

                <div className="bg-amber-500 p-4 flex items-center justify-center">
                  <div className="w-full h-full bg-white/90 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-full bg-amber-500 border-2 border-white shadow-md"></div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-center space-y-6">
                
                <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Turn:{' '}
                  <span className="uppercase font-extrabold text-emerald-500">
                    {currentTurn} Team
                  </span>
                </div>

                <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-4xl font-extrabold shadow-xl">
                  {dice ? dice : <Dices className="w-10 h-10 animate-bounce" />}
                </div>

                <button
                  onClick={rollDice}
                  disabled={isRolling}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Dices className="w-5 h-5" />
                  <span>{isRolling ? 'Rolling...' : 'Roll Ludo Dice!'}</span>
                </button>

              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
