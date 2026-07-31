'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import {
  ArrowLeft,
  Wallet,
  Sparkles,
  Trophy,
  RotateCcw,
  Gift,
  Bomb,
  X,
  Coins,
  TrendingUp,
  Target,
  Percent,
  LogOut,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VaultTile {
  num: number;
  reward: number; // 0 = empty tile, >0 = cash prize in rupees
  isFlipped: boolean;
}

interface SessionStats {
  attempts: number;
  wins: number;
  losses: number;
  totalWon: number;
}

const ENTRY_COST = 10;

// Payout structure — 18 of 100 tiles pay out (18% odds), the rest are empty.
const PAYOUT_TIERS = [
  { amount: 50, count: 1 },
  { amount: 25, count: 4 },
  { amount: 15, count: 6 },
  { amount: 12, count: 7 },
];
const TOTAL_TILES = 100;
const WIN_TILE_COUNT = PAYOUT_TIERS.reduce((sum, t) => sum + t.count, 0);
const EMPTY_TILE_COUNT = TOTAL_TILES - WIN_TILE_COUNT;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function NumberPredictPage() {
  const { user, updateWalletBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  const router = useRouter();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const handleBackToGames = (e: React.MouseEvent) => {
    if (hasEntered && flippedIndex === null) {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };

  const [hasEntered, setHasEntered] = useState(false);
  const [tiles, setTiles] = useState<VaultTile[]>([]);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popup, setPopup] = useState<{ title: string; desc: string; type: 'win' | 'sorry' } | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    attempts: 0,
    wins: 0,
    losses: 0,
    totalWon: 0,
  });

  const initializeVault = () => {
    const numbers = shuffle(Array.from({ length: TOTAL_TILES }, (_, i) => i + 1));
    const isDemo = playMode === 'DEMO';
    const multiplier = isDemo ? 10 : 1;
    const rewardsPool = shuffle([
      ...PAYOUT_TIERS.flatMap((t) => Array(t.count).fill(t.amount * multiplier)),
      ...Array(EMPTY_TILE_COUNT).fill(0),
    ]);

    setTiles(numbers.map((num, idx) => ({ num, reward: rewardsPool[idx], isFlipped: false })));
  };

  const handleEnter = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (playMode === 'DEMO') {
      showToast('🔒 Real Money Mode Required: Switch to REAL MONEY mode in top header navbar to play paid games!', 'warning');
      return;
    }
    const currentBalance = user?.walletBalance || 0;
    if (currentBalance < ENTRY_COST) {
      showToast(`Insufficient Real Money balance! Entry fee is ₹${ENTRY_COST}. Current balance: ₹${formatCurrency(currentBalance)}.`, 'error');
      return;
    }

    await updateWalletBalance(-ENTRY_COST);
    initializeVault();
    setHasEntered(true);
    setFlippedIndex(null);
    setShowPopup(false);
    setPopup(null);
  };

  const handleTileClick = async (index: number) => {
    if (!hasEntered || flippedIndex !== null) return;

    const selected = tiles[index];
    setTiles((prev) => prev.map((t, i) => (i === index ? { ...t, isFlipped: true } : t)));
    setFlippedIndex(index);

    if (selected.reward > 0) {
      await recordGameMatch('number-predict', 'Number Predict & Win', 'WIN', ENTRY_COST, selected.reward, 'Jackpot Grid');
      setSessionStats((s) => ({
        ...s,
        attempts: s.attempts + 1,
        wins: s.wins + 1,
        totalWon: s.totalWon + selected.reward,
      }));
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setPopup({
        title: `You won ₹${selected.reward}!`,
        desc: `Tile #${selected.num} held ₹${selected.reward}. It's already in your wallet.`,
        type: 'win',
      });
    } else {
      await recordGameMatch('number-predict', 'Number Predict & Win', 'LOSS', ENTRY_COST, 0, 'Jackpot Grid');
      setSessionStats((s) => ({ ...s, attempts: s.attempts + 1, losses: s.losses + 1 }));
      setPopup({
        title: 'Empty tile',
        desc: `Tile #${selected.num} was empty this round. Try another vault!`,
        type: 'sorry',
      });
    }
    setShowPopup(true);
  };

  const winRate = sessionStats.attempts > 0 ? Math.round((sessionStats.wins / sessionStats.attempts) * 100) : 0;
  const netResult = sessionStats.totalWon - sessionStats.attempts * ENTRY_COST;

  return (
    <ProtectedRoute>
      <style jsx global>{`
        .vault-tile-face {
          backface-visibility: hidden;
          position: absolute;
          inset: 0;
        }
        .vault-tile-face-back {
          transform: rotateY(180deg);
        }
        .vault-tile-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
        }
        .vault-tile-flipped {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/#games-section"
          onClick={handleBackToGames}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>18% Odds Cash Vault</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Number Predict & Win
              </h1>
            </div>

            <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
              <Wallet className="w-4 h-4" />
              <span>{playMode === 'REAL' ? `Entry: ₹${ENTRY_COST} | Win up to ₹50` : `Entry: 🪙 ${ENTRY_COST * 10} | Win up to 🪙 500`}</span>
            </div>
          </div>

          {!hasEntered ? (
            <div className="text-center py-10 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="max-w-md mx-auto aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/30">
                <img
                  src="/images/number_predict_cover.png"
                  alt="Number Predict & Win"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">{playMode === 'REAL' ? 'Reveal 1 Tile, Win Up to ₹50' : 'Reveal 1 Tile, Win Up to 🪙 500'}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {playMode === 'REAL'
                    ? `Pay a ₹${ENTRY_COST} entry to open a freshly shuffled 100-tile vault. 18 tiles pay out real cash, straight to your wallet.`
                    : `Pay 🪙 ${ENTRY_COST * 10} Demo Coins to open a freshly shuffled 100-tile vault. 18 tiles pay out practice coins.`}
                </p>
              </div>

              {/* Payout tiers shown up front so the odds are clear before paying */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                {PAYOUT_TIERS.map((tier) => (
                  <div
                    key={tier.amount}
                    className="py-3 px-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center"
                  >
                    <span className="text-lg font-black text-emerald-500">
                      {playMode === 'REAL' ? `₹${tier.amount}` : `🪙 ${tier.amount * 10}`}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{tier.count} tiles</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {EMPTY_TILE_COUNT} of {TOTAL_TILES} tiles are empty this round.
              </p>

              <button
                onClick={handleEnter}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                {playMode === 'REAL' ? `Pay ₹${ENTRY_COST} & Open Vault` : `Pay 🪙 ${ENTRY_COST * 10} & Open Vault`}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Vault board */}
              <div className="lg:col-span-8 flex flex-col items-center space-y-4">
                <div className="text-center">
                  {flippedIndex === null ? (
                    <div className="inline-flex items-center space-x-2 text-sm font-bold bg-emerald-500/10 text-emerald-500 px-5 py-2 rounded-full border border-emerald-500/20">
                      <Sparkles className="w-4 h-4" />
                      <span>Vault unlocked — tap any tile to reveal it</span>
                    </div>
                  ) : tiles[flippedIndex].reward > 0 ? (
                    <div className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-lg">
                      <Trophy className="w-5 h-5 text-amber-300" />
                      <span>
                        Tile #{tiles[flippedIndex].num} paid ₹{tiles[flippedIndex].reward}!
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-slate-900 text-rose-400 font-black text-sm shadow-lg">
                      <Bomb className="w-5 h-5" />
                      <span>Tile #{tiles[flippedIndex].num} was empty</span>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-[460px] p-3 sm:p-4 rounded-3xl bg-slate-900 border-4 border-slate-900 dark:border-slate-700 shadow-2xl">
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                    {tiles.map((tile, idx) => (
                      <button
                        key={`${tile.num}-${idx}`}
                        disabled={flippedIndex !== null}
                        onClick={() => handleTileClick(idx)}
                        style={{ perspective: '400px' }}
                        className="aspect-square rounded-md sm:rounded-lg disabled:cursor-default"
                      >
                        <div className={`vault-tile-inner ${tile.isFlipped ? 'vault-tile-flipped' : ''}`}>
                          <div className="vault-tile-face rounded-md sm:rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-slate-400 transition-colors">
                            {tile.num}
                          </div>
                          <div
                            className={`vault-tile-face vault-tile-face-back rounded-md sm:rounded-lg border-2 flex items-center justify-center ${
                              tile.reward > 0
                                ? 'bg-white border-emerald-500 text-emerald-600'
                                : 'bg-rose-950 border-rose-700 text-rose-400'
                            }`}
                          >
                            {tile.reward > 0 ? (
                              <span className="text-[8px] sm:text-[10px] font-black">₹{tile.reward}</span>
                            ) : (
                              <Bomb className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Session analytics + controls */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6">
                  <button
                    onClick={handleEnter}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Vault (₹{ENTRY_COST} Entry)</span>
                  </button>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center space-x-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black uppercase text-slate-900 dark:text-white font-['Space_Grotesk']">
                        Session Analytics
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center space-x-1 text-slate-400">
                          <Target className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Attempts</span>
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {sessionStats.attempts}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center space-x-1 text-slate-400">
                          <Percent className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Win Rate</span>
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{winRate}%</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center space-x-1 text-emerald-500">
                          <Trophy className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Wins</span>
                        </div>
                        <span className="text-lg font-black text-emerald-500">{sessionStats.wins}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center space-x-1 text-rose-500">
                          <Bomb className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Losses</span>
                        </div>
                        <span className="text-lg font-black text-rose-500">{sessionStats.losses}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold uppercase text-slate-300">Total Won</span>
                      </div>
                      <span className="text-base font-black text-amber-400">₹{sessionStats.totalWon}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold px-1">
                      <span className="text-slate-400">Net this session</span>
                      <span className={netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {netResult >= 0 ? '+' : ''}
                        ₹{netResult}
                      </span>
                    </div>

                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'LEAVE_GAME' })}
                      className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-2 mt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave Game</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <GameConfirmModal
            isOpen={confirmModal.isOpen}
            title={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Start Next Match?'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'Exit Active Game?'
                : 'Exit to All Games?'
            }
            message={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Are you sure you want to start the next match?'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'You are currently in an active game. Leaving now will exit the current game. Are you sure you want to leave?'
                : 'Are you sure you want to exit to All Games?'
            }
            confirmText={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Yes, Start Match'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'Yes, Leave Game'
                : 'Yes, Exit'
            }
            cancelText="No, Keep Playing"
            variant={confirmModal.type === 'NEXT_MATCH' ? 'warning' : 'danger'}
            onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={() => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              if (confirmModal.type === 'NEXT_MATCH') {
                handleEnter();
              } else {
                router.push('/#games-section');
              }
            }}
          />

        </div>

        {/* Result modal */}
        {showPopup && popup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="relative w-full max-w-md p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl text-center space-y-6">
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div
                className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-xl ${
                  popup.type === 'win' ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                {popup.type === 'win' ? (
                  <Trophy className="w-8 h-8 text-amber-300" />
                ) : (
                  <Bomb className="w-8 h-8 text-rose-400" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black font-['Space_Grotesk']">{popup.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{popup.desc}</p>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleEnter}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg transition-all"
                >
                  Open a New Vault (₹{ENTRY_COST})
                </button>
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:opacity-80 transition-all"
                >
                  Close & View Vault
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
