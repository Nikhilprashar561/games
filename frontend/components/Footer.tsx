'use client';

import React from 'react';
import Link from 'next/link';
import { Gamepad2, Heart, Shield, Terminal, Dices } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-slate-800/80 bg-[#05070b]/95 backdrop-blur-xl transition-colors duration-300 py-6 sm:py-8 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          {/* Logo & Brand Copyright */}
          <Link href="/" className="flex items-center justify-center space-x-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-emerald-500/30 group-hover:border-emerald-400 flex items-center justify-center text-emerald-400 shadow-md transition-colors">
              <Dices className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm sm:text-base font-black tracking-tight text-white font-['Space_Grotesk']">
                BAAZI <span className="text-emerald-500">BOARD</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                &copy; {new Date().getFullYear()} All Rights Reserved
              </span>
            </div>
          </Link>

          {/* Quick Badges - Wrap gracefully on small mobile screens without bullet overlap */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-slate-300">
            <a
              href="#games-section"
              className="hover:text-emerald-400 transition-colors flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>All Skill Games</span>
            </a>
            
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-emerald-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supreme Court Recognized Skill Games</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-amber-400">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>🔞 18+ Only</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="text-xs text-slate-400 flex flex-col items-center md:items-end justify-center font-semibold">
            <div className="flex items-center space-x-1">
              <span>Built with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
              <span>for Skill Gamers</span>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1 text-center md:text-right">
              Baazi Board offers eSports skill-based contests (Chess, Carrom, Ludo, Tic-Tac-Toe). Play responsibly.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};
