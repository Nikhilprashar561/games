'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Wallet, Sparkles, Trophy, RotateCcw, Gift, Bomb, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GridTile {
  num: number;
  reward: number; // 0 = bomb/loss, >0 = won ₹ rupees
  isFlipped: boolean;
}

export default function NumberPredictPage() {
  const { user, updateWalletBalance, recordGameMatch, openAuthModal } = useAuth();
  const ENTRY_COST = 10;

  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [tiles, setTiles] = useState<GridTile[]>([]);
  const [flippedTile, setFlippedTile] = useState<GridTile | null>(null);
  const [showPopupModal, setShowPopupModal] = useState<boolean>(false);
  const [popupMessage, setPopupMessage] = useState<{ title: string; desc: string; type: 'win' | 'sorry' } | null>(null);

  // Generate unsystematically shuffled 1-100 grid with strict 25% win odds
  const initializeGrid = () => {
    // 1 to 100 numbers array
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    // Shuffle array unsystematically
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Exactly 25 winning tiles (25% probability)
    // 2 x ₹250, 5 x ₹100, 8 x ₹50, 10 x ₹20 = 25 winning tiles
    const rewardsPool = [
      ...Array(2).fill(250),
      ...Array(5).fill(100),
      ...Array(8).fill(50),
      ...Array(10).fill(20),
      ...Array(75).fill(0), // 75 bomb tiles
    ];

    // Shuffle rewards pool
    for (let i = rewardsPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rewardsPool[i], rewardsPool[j]] = [rewardsPool[j], rewardsPool[i]];
    }

    const newTiles: GridTile[] = numbers.map((num, idx) => ({
      num,
      reward: rewardsPool[idx],
      isFlipped: false,
    }));

    setTiles(newTiles);
  };

  const handleEnterGame = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to flip a tile.`);
      return;
    }

    await updateWalletBalance(-ENTRY_COST);
    initializeGrid();
    setHasEntered(true);
    setFlippedTile(null);
    setShowPopupModal(false);
    setPopupMessage(null);
  };

  const handleTileClick = async (index: number) => {
    if (!hasEntered || flippedTile) return;

    const selected = tiles[index];
    selected.isFlipped = true;
    setFlippedTile(selected);

    if (selected.reward > 0) {
      // WIN: Credit real money directly to user wallet
      await updateWalletBalance(selected.reward);
      await recordGameMatch('number-predict', 'Number Predict & Win', 'WIN', ENTRY_COST, selected.reward, 'Jackpot Grid');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

      setPopupMessage({
        title: `CONGRATULATIONS! YOU WON ₹${selected.reward}! 🎉`,
        desc: `Tile #${selected.num} contained ₹${selected.reward}! Money has been credited directly to your Wallet Account.`,
        type: 'win',
      });
    } else {
      // LOSS: 75% bomb tile
      await recordGameMatch('number-predict', 'Number Predict & Win', 'LOSS', ENTRY_COST, 0, 'Jackpot Grid');
      setPopupMessage({
        title: 'Better Luck Next Time! 💣',
        desc: `Tile #${selected.num} triggered a bomb! Try again for cash rewards!`,
        type: 'sorry',
      });
    }
    setShowPopupModal(true);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        {/* Main High-Contrast Dark & White Grid Container */}
        <div className="rounded-3xl p-6 sm:p-10 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white shadow-2xl transition-colors duration-300">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-black/20 dark:border-white/20">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>25% Win Rate Cash Grid</span>
              </div>
              <h1 className="text-3xl font-black text-black dark:text-white font-['Space_Grotesk']">
                Number Predict & Win
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry Fee: ₹{ENTRY_COST}</span>
              </div>
            </div>
          </div>

          {!hasEntered ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-2xl border border-black dark:border-white">
                <Gift className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">
                  Flip 1 Tile to Win Up To ₹250!
                </h2>
                <p className="text-sm opacity-80 leading-relaxed font-semibold">
                  Pay <span className="font-bold underline">₹10 entry</span> to reveal the unsystematically shuffled grid. 25 tiles contain real money cash prizes!
                </p>
              </div>

              <button
                onClick={handleEnterGame}
                className="px-8 py-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-lg shadow-2xl border border-black dark:border-white hover:scale-105 transition-all"
              >
                Pay ₹10 & Reveal Grid!
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="text-center">
                {flippedTile ? (
                  <div className="inline-flex items-center space-x-3 px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-lg shadow-2xl border border-black dark:border-white animate-fade-in">
                    {flippedTile.reward > 0 ? (
                      <>
                        <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                        <span>REVEALED TILE #{flippedTile.num} AND WON ₹{flippedTile.reward}! 🎉</span>
                      </>
                    ) : (
                      <>
                        <Bomb className="w-6 h-6 text-rose-500 animate-ping" />
                        <span>BOMB EXPLODED ON TILE #{flippedTile.num}! 💣</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-2 text-sm font-bold bg-black/5 dark:bg-white/10 px-5 py-2 rounded-full border border-black/20 dark:border-white/20">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Grid Active! Click any 1 box to flip!</span>
                  </div>
                )}
              </div>

              {/* Unsystematic Shuffled 10x10 Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5 max-w-4xl mx-auto p-4 rounded-3xl bg-black dark:bg-black border-4 border-black dark:border-white shadow-2xl relative">
                {tiles.map((tile, idx) => (
                  <button
                    key={`${tile.num}-${idx}`}
                    disabled={!!flippedTile}
                    onClick={() => handleTileClick(idx)}
                    className={`aspect-square rounded-xl text-xs sm:text-sm font-black flex items-center justify-center transition-all duration-300 transform select-none shadow-md relative overflow-hidden ${
                      tile.isFlipped
                        ? tile.reward > 0
                          ? 'bg-white text-black scale-105 border-2 border-black font-black'
                          : 'bg-rose-950 text-rose-400 border-2 border-rose-600 scale-105'
                        : 'bg-zinc-900 hover:bg-white text-white hover:text-black border border-zinc-700 hover:scale-105'
                    }`}
                  >
                    {tile.isFlipped ? (
                      tile.reward > 0 ? (
                        <span className="text-[10px] sm:text-xs font-black tracking-tighter text-black">
                          ₹{tile.reward}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center animate-bounce">
                          <Bomb className="w-5 h-5 text-rose-500 animate-pulse" />
                        </div>
                      )
                    ) : (
                      /* Display Shuffled Tile Number */
                      <span>{tile.num}</span>
                    )}
                  </button>
                ))}
              </div>

              {flippedTile && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleEnterGame}
                    className="px-8 py-3.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-sm border-2 border-black dark:border-white hover:scale-105 transition-all flex items-center space-x-2 shadow-xl"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Again (₹10 Entry)</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Win/Loss Modal */}
        {showPopupModal && popupMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md p-8 rounded-3xl bg-white dark:bg-black border-4 border-black dark:border-white text-black dark:text-white shadow-2xl text-center space-y-6">
              
              <button
                onClick={() => setShowPopupModal(false)}
                className="absolute top-4 right-4 p-2 text-black dark:text-white hover:opacity-70 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-20 h-20 mx-auto rounded-3xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xl">
                {popupMessage.type === 'win' ? (
                  <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
                ) : (
                  <Bomb className="w-10 h-10 text-rose-500 animate-pulse" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black font-['Space_Grotesk']">
                  {popupMessage.title}
                </h3>
                <p className="text-sm opacity-80 leading-relaxed font-semibold">
                  {popupMessage.desc}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleEnterGame}
                  className="w-full py-3.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-sm border-2 border-black dark:border-white transition-all shadow-lg"
                >
                  Play Again (₹10 Stake)
                </button>
                <button
                  onClick={() => setShowPopupModal(false)}
                  className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/10 font-bold text-xs hover:opacity-80 transition-all"
                >
                  Close & View Grid
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
