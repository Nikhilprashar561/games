'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Dices, RotateCcw, ShieldCheck, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

const LADDERS: Record<number, number> = { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91 };
const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 87: 24, 95: 75, 98: 79 };

export default function SnakeLadderPage() {
  const [player1Pos, setPlayer1Pos] = useState<number>(1);
  const [player2Pos, setPlayer2Pos] = useState<number>(1);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [lastDice, setLastDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);

  const rollDice = () => {
    if (isRolling || gameWinner) return;
    setIsRolling(true);

    setTimeout(() => {
      const dice = Math.floor(Math.random() * 6) + 1;
      setLastDice(dice);

      let currentPos = currentTurn === 1 ? player1Pos : player2Pos;
      let nextPos = currentPos + dice;

      if (nextPos > 100) {
        nextPos = currentPos;
      }

      if (LADDERS[nextPos]) {
        nextPos = LADDERS[nextPos];
      } else if (SNAKES[nextPos]) {
        nextPos = SNAKES[nextPos];
      }

      if (currentTurn === 1) {
        setPlayer1Pos(nextPos);
        if (nextPos === 100) {
          setGameWinner('Player 1 (Blue)');
          confetti({ particleCount: 100, spread: 70 });
        }
      } else {
        setPlayer2Pos(nextPos);
        if (nextPos === 100) {
          setGameWinner('Player 2 (Red)');
          confetti({ particleCount: 100, spread: 70 });
        }
      }

      setIsRolling(false);
      setCurrentTurn(currentTurn === 1 ? 2 : 1);
    }, 400);
  };

  const resetGame = () => {
    setPlayer1Pos(1);
    setPlayer2Pos(1);
    setCurrentTurn(1);
    setLastDice(null);
    setGameWinner(null);
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

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Multiplayer Board</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Snake & Ladder Board
              </h1>
            </div>

            <button
              onClick={resetGame}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Board</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="w-full max-w-md aspect-square border-4 border-slate-800 dark:border-slate-900 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-10 bg-slate-900">
                {Array.from({ length: 100 }, (_, i) => {
                  const cellNum = 100 - i;
                  const isLadder = LADDERS[cellNum];
                  const isSnake = SNAKES[cellNum];
                  const hasP1 = player1Pos === cellNum;
                  const hasP2 = player2Pos === cellNum;

                  return (
                    <div
                      key={cellNum}
                      className={`relative border border-slate-700/40 flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold ${
                        (Math.floor((100 - cellNum) / 10) + cellNum) % 2 === 0
                          ? 'bg-slate-800/80 text-slate-300'
                          : 'bg-slate-900/90 text-slate-400'
                      }`}
                    >
                      <span>{cellNum}</span>
                      {isLadder && <span className="text-[9px] text-emerald-400 font-extrabold">🪜➔{isLadder}</span>}
                      {isSnake && <span className="text-[9px] text-rose-400 font-extrabold">🐍➔{isSnake}</span>}

                      <div className="absolute bottom-0.5 flex space-x-1">
                        {hasP1 && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-200 shadow-md"></div>}
                        {hasP2 && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 shadow-md"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-center space-y-6">
                
                {gameWinner ? (
                  <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-500 font-extrabold text-base flex items-center justify-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>{gameWinner} Wins!</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200">
                    Turn: <span className={currentTurn === 1 ? 'text-cyan-400' : 'text-rose-400'}>
                      Player {currentTurn} ({currentTurn === 1 ? 'Blue' : 'Red'})
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-[10px] font-bold text-cyan-500 uppercase">Player 1 (Blue)</span>
                    <p className="text-xl font-extrabold text-cyan-400 mt-0.5">Tile #{player1Pos}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Player 2 (Red)</span>
                    <p className="text-xl font-extrabold text-rose-400 mt-0.5">Tile #{player2Pos}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-4xl font-extrabold shadow-xl">
                    {lastDice ? lastDice : <Dices className="w-10 h-10 animate-spin" />}
                  </div>

                  <button
                    onClick={rollDice}
                    disabled={isRolling || !!gameWinner}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Dices className="w-5 h-5" />
                    <span>{isRolling ? 'Rolling Dice...' : 'Roll Dice!'}</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
