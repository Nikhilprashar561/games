'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { GameInfo } from '../types';
import { Lock, Play, Users, Sparkles, Coins, Wallet } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { user, openAuthModal, playMode } = useAuth();
  const router = useRouter();

  const handleCardClick = () => {
    if (game.isProtected && !user) {
      openAuthModal();
    } else {
      router.push(`/games/${game.slug}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer glass-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full bg-slate-900"
    >
      {/* Top Image Box */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

        {/* Protection / Mode Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 text-[11px] font-bold shadow-md backdrop-blur-md">
          {!game.isProtected || game.slug === 'tic-tac-toe' ? (
            <span className="bg-amber-600/90 text-white border border-amber-400/40 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Coins className="w-3 h-3 text-amber-300" />
              <span>DEMO COINS</span>
            </span>
          ) : (
            <span className="bg-emerald-600/90 text-white border border-emerald-400/40 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Wallet className="w-3 h-3" />
              <span>REAL CASH</span>
            </span>
          )}
        </div>

        {/* Active Players Badge */}
        <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center space-x-1">
          <Users className="w-3 h-3 text-emerald-400" />
          <span>{game.playersCount}</span>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/40 backdrop-blur-[2px]">
          <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transform group-hover:scale-110 transition-transform">
            {game.isProtected && !user ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {game.category}
            </span>
            {game.slug === 'tic-tac-toe' ? (
              <span className="text-xs font-bold text-amber-400">
                Fee: 🪙 10 Demo
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-400">
                Entry: ₹{game.entryFee}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors font-['Space_Grotesk']">
            {game.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-400 text-[11px]">
            {game.isProtected && !user ? 'Login Required' : game.slug === 'tic-tac-toe' ? 'Play in Demo Mode (Free)' : 'Play for Real Cash 💰'}
          </span>
          <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center text-xs">
            Launch &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
