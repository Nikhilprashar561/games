'use client';

import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { GameCard } from '../components/GameCard';
import { AboutFaqSection } from '../components/AboutFaqSection';
import { gamesData } from '../data/gamesData';
import { Flame, Trophy } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Wireframe Hero Section */}
      <HeroSection />

      {/* Wireframe Active & Total Games Cards Grid Section */}
      <section id="games-section" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>Active Arenas</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Space_Grotesk']">
              Active & Available Games
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Select a game to start playing. Tic Tac Toe is free, while premium titles unlock upon quick login!
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>7 Live Multiplayer Arenas</span>
          </div>
        </div>

        {/* Compact Refined Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gamesData.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* Wireframe About & FAQ Section */}
      <AboutFaqSection />
    </div>
  );
}
