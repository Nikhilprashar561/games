'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Coins, Sparkles, Trophy, RotateCcw, HelpCircle, Frown, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GridTile {
  num: number;
  reward: number;
  isFlipped: boolean;
}

export default function NumberPredictPage() {
  const { user, updateUserCoins, openAuthModal } = useAuth();
  const ENTRY_COST = 10;

  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [tiles, setTiles] = useState<GridTile[]>([]);
  const [flippedTile, setFlippedTile] = useState<GridTile | null>(null);
  const [gameResult, setGameResult] = useState<'jackpot' | 'win' | 'sorry' | null>(null);

  const initializeGrid = () => {
    const newTiles: GridTile[] = Array.from({ length: 100 }, (_, i) => {
      const num = i + 1;
      const rand = Math.random();
      let reward = 0;
      if (rand < 0.08) reward = 250;
      else if (rand < 0.35) reward = 50;
      else reward = 0;

      return { num, reward, isFlipped: false };
    });
    setTiles(newTiles);
  };

  const handleEnterGame = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (user.coins < ENTRY_COST) {
      alert('You need at least 10 coins to enter! Play or visit daily.');
      return;
    }

    await updateUserCoins(-ENTRY_COST);
    initializeGrid();
    setHasEntered(true);
    setFlippedTile(null);
    setGameResult(null);
  };

  const handleTileClick = async (index: number) => {
    if (!hasEntered || flippedTile) return;

    const selected = tiles[index];
    selected.isFlipped = true;
    setFlippedTile(selected);

    if (selected.reward >= 200) {
      setGameResult('jackpot');
      await updateUserCoins(selected.reward);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    } else if (selected.reward > 0) {
      setGameResult('win');
      await updateUserCoins(selected.reward);
      confetti({ particleCount: 70, spread: 60 });
    } else {
      setGameResult('sorry');
    }
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
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1 to 100 Mystery Grid</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Number Predict & Win
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-sm">
                <Coins className="w-4 h-4" />
                <span>Entry Fee: {ENTRY_COST} Coins</span>
              </div>
            </div>
          </div>

          {!hasEntered ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/20">
                <Gift className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                  Test Your Luck on the 100 Grid!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pay 10 coins to unlock the 1-100 grid. You get <span className="font-bold text-emerald-500">1 single flip chance</span>. Reveal cash rewards, mega jackpots, or a sorry message!
                </p>
              </div>

              <button
                onClick={handleEnterGame}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay 10 Coins & Start Grid!
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="text-center">
                {flippedTile ? (
                  <div className="inline-flex items-center space-x-3 px-8 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-lg shadow-2xl border border-slate-700 animate-fade-in">
                    {gameResult === 'jackpot' && (
                      <>
                        <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                        <span className="text-amber-400">JACKPOT! YOU REVEALED TILE #{flippedTile.num} AND WON +{flippedTile.reward} COINS! 🎉</span>
                      </>
                    )}
                    {gameResult === 'win' && (
                      <>
                        <Gift className="w-6 h-6 text-emerald-400" />
                        <span className="text-emerald-400">WINNER! TILE #{flippedTile.num} GRANTS +{flippedTile.reward} COINS!</span>
                      </>
                    )}
                    {gameResult === 'sorry' && (
                      <>
                        <Frown className="w-6 h-6 text-rose-400" />
                        <span className="text-rose-400">SORRY! Tile #{flippedTile.num} had 0 coins. Better luck next time!</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-5 py-2 rounded-full">
                    <HelpCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>Grid Active! Click any 1 box among 1 to 100 to flip!</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5 max-w-4xl mx-auto p-4 rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl">
                {tiles.map((tile, idx) => (
                  <button
                    key={tile.num}
                    disabled={!!flippedTile}
                    onClick={() => handleTileClick(idx)}
                    className={`aspect-square rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center transition-all duration-300 transform select-none shadow-md ${
                      tile.isFlipped
                        ? tile.reward >= 200
                          ? 'bg-amber-400 text-slate-950 scale-110 ring-4 ring-amber-300'
                          : tile.reward > 0
                          ? 'bg-emerald-500 text-white scale-105'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 hover:bg-emerald-600/80 text-slate-300 hover:text-white border border-slate-700 hover:scale-105 hover:shadow-emerald-500/30'
                    }`}
                  >
                    {tile.isFlipped ? (
                      tile.reward > 0 ? `+${tile.reward}` : '❌'
                    ) : (
                      <span>{tile.num}</span>
                    )}
                  </button>
                ))}
              </div>

              {flippedTile && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleEnterGame}
                    className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Another Round (10 Coins)</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
