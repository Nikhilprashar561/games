'use client';

import React from 'react';
import { Gamepad2, Heart, Shield, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#05070b]/80 backdrop-blur-md transition-colors duration-300 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Copyright */}
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wider font-['Space_Grotesk']">
              BAAZI BOARD &copy; {new Date().getFullYear()}
            </span>
          </div>

          {/* Quick Links */}
          <div className="flex items-center space-x-6 text-xs font-bold text-slate-500 dark:text-slate-400">
            <a href="#games-section" className="hover:text-emerald-500 transition-colors">Games</a>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>JWT Secured</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="flex items-center space-x-1">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              <span>Socket.io Engine</span>
            </span>
          </div>

          {/* Tagline */}
          <div className="text-xs text-slate-400 flex items-center space-x-1 font-semibold">
            <span>Built with Next.js &</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>for Realtime Gaming</span>
          </div>

        </div>
      </div>
    </footer>
  );
};
