'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Coins, LogOut, User as UserIcon, ChevronDown, Play, Dices } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, openAuthModal, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/85 dark:bg-[#05070b]/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand New Fancy Text Logo: Pure Dark/White + Subtle Green Accent */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-950 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 group-hover:border-emerald-400 group-hover:shadow-emerald-500/25 transition-all duration-300">
              <Dices className="w-5 h-5 text-emerald-400 transform group-hover:rotate-180 transition-transform duration-700" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-['Space_Grotesk']">
                  BAAZI
                </span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-500 font-['Space_Grotesk']">
                  BOARD
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase -mt-1 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Play & Win Daily</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 font-semibold text-sm">
            <a
              href="#games-section"
              className="text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors"
            >
              All Games
            </a>
            <Link
              href="/games/tic-tac-toe"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold transition-all border border-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Free Game</span>
            </Link>
          </nav>

          {/* Right Action Section */}
          <div className="flex items-center space-x-5">
            {/* Mode Switcher */}
            <div className="flex items-center space-x-2">
              <span className="hidden sm:inline text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mode
              </span>
              <ThemeToggle />
            </div>

            {/* Auth Buttons / Logged In State */}
            {user ? (
              <div className="relative">
                <div className="flex items-center space-x-3">
                  {/* Coin Badge */}
                  <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Coins {user.coins}</span>
                  </div>

                  {/* User Profile Dropdown Button */}
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full bg-emerald-500/20"
                    />
                    <span className="hidden sm:inline font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {user.name}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 glass-panel rounded-2xl p-2 shadow-2xl z-50 border border-slate-200 dark:border-slate-800">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-400 uppercase font-bold">Signed in as</p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push('/profile');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-emerald-500" />
                      <span>User Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-5 py-2.5 rounded-xl font-extrabold text-sm bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-md transition-all duration-200 border border-emerald-500/30"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
