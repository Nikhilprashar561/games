'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, ShieldCheck, Trophy, Wallet, RotateCcw, Spade, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  num: number;
}

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export default function TeenPattiPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 50;
  const WIN_REWARD = 95;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [opponentCards, setOpponentCards] = useState<Card[]>([]);
  const [opponentName, setOpponentName] = useState<string>('Priya_Gamer');
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [showCards, setShowCards] = useState<boolean>(false);
  const [betType, setBetType] = useState<'blind' | 'chaal'>('blind');
  const [potAmount, setPotAmount] = useState<number>(100);
  const [winner, setWinner] = useState<string | null>(null);

  const drawHand = (): Card[] => {
    const hand: Card[] = [];
    for (let i = 0; i < 3; i++) {
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const valIdx = Math.floor(Math.random() * VALUES.length);
      hand.push({ suit, value: VALUES[valIdx], num: valIdx + 2 });
    }
    return hand;
  };

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Teen Patti table.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setPlayerCards(drawHand());
    setOpponentCards(drawHand());
    setOpponentName(getRandomOpponentName());
    setBetType('blind');
    setPotAmount(100);
    setShowCards(false);
    setIsOpponentThinking(false);
    setWinner(null);
  };

  const evaluateRankName = (hand: Card[]) => {
    if (hand.length < 3) return 'High Card';
    const nums = hand.map((c) => c.num).sort((a, b) => a - b);
    const isTrail = nums[0] === nums[1] && nums[1] === nums[2];
    const isSequence = nums[2] - nums[1] === 1 && nums[1] - nums[0] === 1;
    const isColor = hand[0].suit === hand[1].suit && hand[1].suit === hand[2].suit;
    const isPair = nums[0] === nums[1] || nums[1] === nums[2] || nums[0] === nums[2];

    if (isTrail) return 'Trio / Trail 🔥';
    if (isSequence && isColor) return 'Pure Sequence ✨';
    if (isSequence) return 'Sequence ♠';
    if (isColor) return 'Color Flush 🎨';
    if (isPair) return 'Pair 🃏';
    return 'High Card';
  };

  const handleShowdown = async () => {
    if (showCards || winner || isOpponentThinking) return;

    setIsOpponentThinking(true);
    setTimeout(async () => {
      setIsOpponentThinking(false);
      setShowCards(true);

      const playerScore = playerCards.reduce((sum, c) => sum + c.num, 0);
      const opponentScore = opponentCards.reduce((sum, c) => sum + c.num, 0);

      if (playerScore >= opponentScore) {
        const winnerName = user?.name || 'Player';
        setWinner(winnerName);
        await updateWalletBalance(WIN_REWARD);
        await recordGameMatch('teen-patti', 'Teen Patti Pro', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
        confetti({ particleCount: 120, spread: 80 });
      } else {
        setWinner(opponentName);
        await recordGameMatch('teen-patti', 'Teen Patti Pro', 'LOSS', ENTRY_COST, 0, opponentName);
      }
    }, 2000); // 2s thinking delay for realistic chaal showdown
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
                <span>Casino VIP Table</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Teen Patti Pro
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
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-xl">
                <Spade className="w-10 h-10 animate-bounce" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">High Stakes 3-Card Table</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹50 entry to deal cards against live opponent <span className="font-bold text-emerald-500">{opponentName}</span>. Best hand wins ₹95!
                </p>
              </div>
              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all"
              >
                Pay ₹50 & Deal Cards!
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Opponent Cards Section */}
              <div className="text-center space-y-3">
                <p className="text-xs font-extrabold text-slate-400 uppercase">Opponent: {opponentName}</p>
                <div className="flex justify-center gap-3">
                  {opponentCards.map((card, i) => (
                    <div
                      key={i}
                      className="w-16 h-24 rounded-xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-xl"
                    >
                      {showCards ? `${card.value}${card.suit}` : '🂠'}
                    </div>
                  ))}
                </div>
                {showCards && (
                  <span className="text-xs font-bold text-amber-500">{evaluateRankName(opponentCards)}</span>
                )}
              </div>

              {/* Showdown Winner / Thinking Banner */}
              <div className="text-center">
                {winner ? (
                  <div className="inline-flex items-center space-x-2 px-8 py-3 rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-xl animate-bounce">
                    <Trophy className="w-5 h-5 text-amber-300" />
                    <span>{winner} Wins ₹{WIN_REWARD} Pot! 🎉</span>
                  </div>
                ) : isOpponentThinking ? (
                  <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-5 py-2 rounded-full border border-emerald-500/20">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>{opponentName} is placing Chaal bet...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleShowdown}
                    className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl transition-all"
                  >
                    Showdown & Claim Pot (₹{potAmount})!
                  </button>
                )}
              </div>

              {/* Player Cards Section */}
              <div className="text-center space-y-3">
                <p className="text-xs font-extrabold text-emerald-500 uppercase">{user?.name}'s Hand (You)</p>
                <div className="flex justify-center gap-3">
                  {playerCards.map((card, i) => (
                    <div
                      key={i}
                      className="w-16 h-24 rounded-xl bg-white text-slate-900 border-2 border-slate-300 flex flex-col items-center justify-center text-xl font-black shadow-xl"
                    >
                      <span>{card.value}</span>
                      <span className={card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'}>
                        {card.suit}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-emerald-500">{evaluateRankName(playerCards)}</span>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleStartMatch}
                  className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Deal Next Table (₹50 Entry)</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
