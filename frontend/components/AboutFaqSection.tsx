'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ShieldCheck, Zap, Award, Users } from 'lucide-react';

export const AboutFaqSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which games are free to play on Baazi Board?',
      a: 'Tic-Tac-Toe is 100% public and free to play for all visitors without needing to log in. Other premium multiplayer games like Chess, Ludo, Snake & Ladder, Teen Patti, Carrom, and Number Predict require a quick free account signup to track rankings and coin rewards.',
    },
    {
      q: 'How does real-time multiplayer work?',
      a: 'Our live game engine connects you instantly with players in real-time so every move happens smoothly without any delay.',
    },
    {
      q: 'How do Coins work in games like Number Predict?',
      a: 'Every registered account starts with 100 bonus coins. In games like Number Predict & Win, entry costs 10 coins for a chance to flip 1 of 100 tiles to win up to 500 bonus coins or cash multipliers!',
    },
    {
      q: 'Is my account safe and secure?',
      a: 'Yes! Your profile account and coin winnings are completely safe, private, and encrypted.',
    },
  ];

  return (
    <section className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Platform Info & FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk']">
              About Baazi Board & FAQs
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-base">
              Everything you need to know about our live gaming platform.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Instant Play</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Smooth, lag-free multiplayer action with instant matching.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Safe & Secure</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your progress, wins, and coin balances are always saved.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Coin Rewards</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Earn coins by winning games and flipping reward numbers.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">7 Classic Games</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chess, Ludo, Carrom, Teen Patti, Tic Tac Toe and more.</p>
            </div>
          </div>

          {/* Accordion FAQ */}
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left font-bold text-slate-900 dark:text-white flex items-center justify-between transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <span className="text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-180 text-emerald-500' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 pt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
