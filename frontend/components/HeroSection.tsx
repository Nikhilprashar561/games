'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Gamepad2, Trophy, Zap, ShieldCheck } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-20">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/15 to-teal-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800/80 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            
            {/* Left Box: Restored Previous Hero Image Container */}
            <div className="lg:col-span-6 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-3xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
                <img
                  src="/images/hero_section.png"
                  alt="Baazi Board Hero"
                  className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/hero_banner_dark.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60">
                  <span className="flex items-center space-x-1.5 text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <span>Play Online Real-Time</span>
                  </span>
                  <span className="flex items-center space-x-1.5 text-amber-400">
                    <Trophy className="w-4 h-4" />
                    <span>Play & Win Real Rewards</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Box: Hero Text Content */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Play & Win Gaming Arena</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight font-['Space_Grotesk']">
                Welcome to <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300">
                  BAAZI BOARD
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                Challenge real players online in Chess, Ludo, Snake & Ladder, Teen Patti, Carrom, and Number Predict! Jump into Tic-Tac-Toe completely free.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/games/tic-tac-toe"
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  <Gamepad2 className="w-5 h-5" />
                  <span>Play Free Game Now</span>
                </Link>

                <a
                  href="#games-section"
                  className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 transition-all flex items-center justify-center"
                >
                  Explore All 7 Games
                </a>
              </div>

              {/* Feature Badges */}
              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Instant Game Rooms</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>100% Safe & Secure</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>100% Fair Play</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
