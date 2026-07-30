'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AddMoneyModal } from './AddMoneyModal';
import { LogOut, User as UserIcon, ChevronDown, Play, Dices, Wallet, PlusCircle, Shield, Coins, History, Trophy, Sparkles, RefreshCw, Menu, KeyRound } from 'lucide-react';
import { formatCurrency, formatCoins } from '../utils/formatCurrency';

export const Navbar: React.FC = () => {
  const { user, loading, openAuthModal, logout, welcomeToast, playMode, setPlayMode } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [addMoneyTab, setAddMoneyTab] = useState<'DEPOSIT' | 'STATUS' | 'WITHDRAW'>('DEPOSIT');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith('/admin');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDepositModal = (tab: 'DEPOSIT' | 'STATUS' | 'WITHDRAW' = 'DEPOSIT') => {
    if (!user) {
      openAuthModal();
      return;
    }
    setAddMoneyTab(tab);
    setIsAddMoneyOpen(true);
    setDropdownOpen(false);
  };

  const walletDisplayBalance = formatCurrency(user?.walletBalance);
  const demoDisplayCoins = formatCoins(user?.demoBalance !== undefined ? user.demoBalance : 1000);

  // DEDICATED CLEAN ADMIN HEADER (NO PLAYER OPTIONS)
  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#05070b]/95 border-b border-amber-500/30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Admin Header Title */}
            <Link href="/admin" className="flex items-center space-x-2.5">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-xl font-black text-white font-['Space_Grotesk']">
                    BAAZI BOARD
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Admin Portal
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Verification & Management System
                </span>
              </div>
            </Link>

            {/* Exit Admin Button */}
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1.5 shadow-md"
              >
                <span>🎮 Exit Admin & Go to Games</span>
              </Link>
            </div>

          </div>
        </div>
      </header>
    );
  }

  // REGULAR PLAYER GAMING HEADER
  return (
    <>
      {/* Floating Welcome Back Banner Toast */}
      {welcomeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-emerald-500 animate-bounce flex items-center space-x-2">
          <span>{welcomeToast}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#05070b]/95 border-b border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            
            {/* Logo */}
            <Link
              href="/"
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 group flex-shrink-0 cursor-pointer z-10"
            >
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 group-hover:border-emerald-400 group-hover:shadow-emerald-500/25 transition-all duration-300">
                <Dices className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 transform group-hover:rotate-180 transition-transform duration-700" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400"></div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white font-['Space_Grotesk']">
                    BAAZI
                  </span>
                  <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-emerald-500 font-['Space_Grotesk']">
                    BOARD
                  </span>
                </div>
                <span className="hidden sm:flex text-[9px] font-bold tracking-widest text-slate-500 uppercase -mt-1 items-center space-x-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Play & Win</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-6 font-semibold text-sm">
              <a
                href="#games-section"
                className="text-slate-300 hover:text-emerald-400 transition-colors"
              >
                All Games
              </a>
            </nav>

            {/* Right Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">

              {/* Mode Switcher Pill */}
              <div className="hidden md:flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-black">
                <button
                  onClick={() => setPlayMode('REAL')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
                    playMode === 'REAL'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Real Money Mode"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-300" />
                  <span>REAL MONEY</span>
                </button>

                <button
                  onClick={() => setPlayMode('DEMO')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
                    playMode === 'DEMO'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Demo Practice Mode"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>DEMO MODE</span>
                </button>
              </div>

              {/* MODE-SPECIFIC BALANCE BADGE */}
              {playMode === 'REAL' ? (
                <div className="flex items-center bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 border border-emerald-500/40 rounded-xl sm:rounded-2xl p-0.5 shadow-md">
                  <div className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-1 text-emerald-400 font-black text-xs sm:text-sm">
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span>₹{walletDisplayBalance}</span>
                  </div>
                  <button
                    onClick={() => openDepositModal('DEPOSIT')}
                    className="flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/30 transition-all"
                    title="Deposit Real Money via QR Code"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm shadow-md">
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/20" />
                  <span>🪙 {demoDisplayCoins}</span>
                </div>
              )}

              {/* Login Button */}
              {!loading && !user && (
                <button
                  onClick={openAuthModal}
                  className="hidden md:flex px-4 py-2 rounded-xl font-extrabold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-md transition-all border border-emerald-500/30"
                >
                  Login
                </button>
              )}

              {/* Profile Menu Dropdown Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-200"
                  aria-label="Toggle Menu"
                >
                  {user ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 object-cover"
                    />
                  ) : (
                    <Menu className="w-5 h-5 text-emerald-400" />
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu - Responsive on Desktop, Tablet & Mobile */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-12 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-[340px] glass-panel rounded-3xl p-2.5 sm:p-3 shadow-2xl z-50 border border-slate-800 bg-[#0a0f1d] animate-fade-in space-y-1.5 text-white max-h-[85vh] overflow-y-auto">
                    
                    {/* User / Guest Info Header */}
                    {user ? (
                      <div className="px-3 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 mb-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white truncate">{user.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            user.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {user.role === 'admin' ? '🛡️ Admin' : '🎮 Player'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-bold">
                          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Real Cash</span>
                            <span>₹{walletDisplayBalance}</span>
                          </div>
                          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <span className="text-[9px] text-slate-400 font-semibold block uppercase">Demo Coins</span>
                            <span>🪙 {demoDisplayCoins}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 mb-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white">Welcome Gamer 🎮</p>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            Guest
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Sign in to play real cash multiplayer games!</p>
                        <button
                          onClick={() => { setDropdownOpen(false); openAuthModal(); }}
                          className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Login / Register Account</span>
                        </button>
                      </div>
                    )}

                    {/* Mode Switcher inside Menu */}
                    <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                        <span>Select Game Mode</span>
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs font-black pt-1">
                        <button
                          onClick={() => { setPlayMode('REAL'); setDropdownOpen(false); }}
                          className={`py-2 rounded-xl flex items-center justify-center space-x-1 transition-all ${
                            playMode === 'REAL'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white bg-slate-950/60'
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5 text-emerald-300" />
                          <span>REAL CASH</span>
                        </button>

                        <button
                          onClick={() => { setPlayMode('DEMO'); setDropdownOpen(false); }}
                          className={`py-2 rounded-xl flex items-center justify-center space-x-1 transition-all ${
                            playMode === 'DEMO'
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-white bg-slate-950/60'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-300" />
                          <span>DEMO COINS</span>
                        </button>
                      </div>
                    </div>

                    {/* Menu Links */}
                    {user && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/profile');
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800/90 rounded-xl transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-emerald-400" />
                        <span>My Profile & Settings</span>
                      </button>
                    )}

                    <button
                      onClick={() => openDepositModal('DEPOSIT')}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>Deposit Real Money (+ Cash)</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => openDepositModal('STATUS')}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800/90 rounded-xl transition-colors"
                      >
                        <History className="w-4 h-4 text-teal-400" />
                        <span>Payment & UTR Status History</span>
                      </button>
                    )}

                    {user && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/profile#stats');
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800/90 rounded-xl transition-colors"
                      >
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>My Match Stats & History</span>
                      </button>
                    )}

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/admin');
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-colors border border-amber-500/20"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Admin Verification Portal</span>
                      </button>
                    )}

                    {user && (
                      <div className="pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      <AddMoneyModal
        isOpen={isAddMoneyOpen}
        onClose={() => setIsAddMoneyOpen(false)}
        initialTab={addMoneyTab}
      />
    </>
  );
};
