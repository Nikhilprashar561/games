'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, Coins, ShieldCheck, Sparkles, Trophy, Eye, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  color: string;
}

const CARDS_DECK: Card[] = [
  { suit: '♠', value: 'A', color: 'text-slate-900 dark:text-white' },
  { suit: '♥', value: 'K', color: 'text-rose-500' },
  { suit: '♦', value: 'Q', color: 'text-rose-500' },
  { suit: '♣', value: 'J', color: 'text-slate-900 dark:text-white' },
  { suit: '♠', value: '10', color: 'text-slate-900 dark:text-white' },
  { suit: '♥', value: 'A', color: 'text-rose-500' },
  { suit: '♦', value: 'A', color: 'text-rose-500' },
  { suit: '♣', value: 'K', color: 'text-slate-900 dark:text-white' },
];

export default function TeenPattiPage() {
  const { user, updateUserCoins } = useAuth();
  const [pot, setPot] = useState<number>(40);
  const [bet] = useState<number>(10);
  const [playerCards, setPlayerCards] = useState<Card[]>([
    { suit: '♠', value: 'A', color: 'text-slate-900 dark:text-white' },
    { suit: '♥', value: 'A', color: 'text-rose-500' },
    { suit: '♦', value: 'K', color: 'text-rose-500' },
  ]);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [roundResult, setRoundResult] = useState<string | null>(null);

  const placeBet = async () => {
    if (!user || user.coins < bet) return;
    await updateUserCoins(-bet);
    setPot((prev) => prev + bet * 2);
  };

  const showDown = async () => {
    setIsRevealed(true);
    const win = Math.random() > 0.4;
    if (win) {
      setRoundResult('YOU WIN THE POT!');
      await updateUserCoins(pot);
      confetti({ particleCount: 90, spread: 60 });
    } else {
      setRoundResult('OPPONENT HAS A FLUSH! YOU LOST.');
    }
  };

  const nextHand = () => {
    setIsRevealed(false);
    setRoundResult(null);
    setPot(40);
    const shuffled = [...CARDS_DECK].sort(() => Math.random() - 0.5);
    setPlayerCards(shuffled.slice(0, 3));
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
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>High Stakes Poker</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Royal Teen Patti
              </h1>
            </div>

            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl text-amber-500 font-bold text-sm">
              <Coins className="w-5 h-5" />
              <span>Pot Size: {pot} Coins</span>
            </div>
          </div>

          <div className="relative rounded-3xl bg-gradient-to-b from-emerald-900 to-emerald-950 border-8 border-amber-900/60 shadow-2xl p-8 min-h-[380px] flex flex-col justify-between overflow-hidden">
            
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center relative z-10">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest block mb-2">Opponent Hand</span>
              <div className="flex justify-center space-x-3">
                {[1, 2, 3].map((_, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-24 rounded-xl bg-amber-900 border-2 border-amber-400/50 shadow-lg flex items-center justify-center text-amber-400 font-bold text-lg"
                  >
                    {isRevealed ? (idx === 0 ? '♦K' : idx === 1 ? '♦Q' : '♦J') : '🂠'}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center my-4 relative z-10">
              {roundResult ? (
                <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-amber-400 text-slate-950 font-black text-lg shadow-xl animate-bounce">
                  <Trophy className="w-5 h-5" />
                  <span>{roundResult}</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 text-emerald-200 font-bold text-xs bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-800">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Place bet or request Showdown</span>
                </div>
              )}
            </div>

            <div className="text-center relative z-10">
              <div className="flex justify-center space-x-3 mb-2">
                {playerCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="w-18 h-28 sm:w-20 sm:h-28 rounded-xl bg-white border-2 border-slate-200 shadow-2xl flex flex-col justify-between p-2 transform hover:-translate-y-2 transition-transform"
                  >
                    <span className={`text-sm font-extrabold ${card.color}`}>{card.value}</span>
                    <span className={`text-3xl text-center ${card.color}`}>{card.suit}</span>
                    <span className={`text-sm font-extrabold text-right ${card.color}`}>{card.value}</span>
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Your Hand (Trio)</span>
            </div>

          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={placeBet}
              disabled={!!roundResult}
              className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Coins className="w-4 h-4 text-amber-300" />
              <span>Raise Bet (+10 Coins)</span>
            </button>

            <button
              onClick={showDown}
              disabled={!!roundResult}
              className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>Showdown (Show Cards)</span>
            </button>

            <button
              onClick={nextHand}
              className="py-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Deal Next Hand</span>
            </button>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
