'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AddMoneyModal } from './AddMoneyModal';
import { LogOut, User as UserIcon, ChevronDown, Play, Dices, Wallet, PlusCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, openAuthModal, logout, welcomeToast } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Floating Welcome Back Banner Toast */}
      {welcomeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-2xl border-2 border-emerald-500 animate-bounce flex items-center space-x-2">
          <span>{welcomeToast}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#05070b]/90 border-b border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Fancy Text Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 group-hover:border-emerald-400 group-hover:shadow-emerald-500/25 transition-all duration-300">
                <Dices className="w-5 h-5 text-emerald-400 transform group-hover:rotate-180 transition-transform duration-700" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Space_Grotesk']">
                    BAAZI
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-500 font-['Space_Grotesk']">
                    BOARD
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase -mt-1 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Play & Win Daily</span>
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 font-semibold text-sm">
              <a
                href="#games-section"
                className="text-slate-300 hover:text-emerald-400 transition-colors"
              >
                All Games
              </a>
              <Link
                href="/games/tic-tac-toe"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-all border border-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Free Game</span>
              </Link>
            </nav>

            {/* Right Actions: Wallet, Add Money & Auth */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              
              {user ? (
                <div className="relative flex items-center space-x-2">
                  
                  {/* Payment Wallet Display */}
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs sm:text-sm">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span>₹{user.walletBalance || 500}</span>
                  </div>

                  {/* Add Money Razorpay Button */}
                  <button
                    onClick={() => setIsAddMoneyOpen(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Money</span>
                  </button>

                  {/* Profile Dropdown */}
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full bg-emerald-500/20"
                    />
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 mt-2 w-60 glass-panel rounded-2xl p-2 shadow-2xl z-50 border border-slate-800">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="text-xs text-slate-400 uppercase font-bold">Signed in as</p>
                        <p className="text-sm font-extrabold text-white truncate">{user.email}</p>
                        <div className="mt-1 flex items-center justify-between text-xs font-bold text-emerald-500">
                          <span>Wallet: ₹{user.walletBalance || 500}</span>
                          <span>UPI: {user.upiId || 'user@paytm'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/profile');
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2.5 mt-1 text-sm font-semibold text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-emerald-500" />
                        <span>User Dashboard & History</span>
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
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
                  className="px-5 py-2.5 rounded-xl font-extrabold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all duration-200 border border-emerald-500/30"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AddMoneyModal isOpen={isAddMoneyOpen} onClose={() => setIsAddMoneyOpen(false)} />
    </>
  );
};
