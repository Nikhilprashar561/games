'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { Coins, LogOut, ShieldCheck, Trophy, Sparkles, Mail, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="glass-panel rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
          
          {/* Glow Header */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-20 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 shadow-xl">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full bg-slate-900 object-cover"
                />
              </div>
              <div className="absolute bottom-1 right-1 p-2 rounded-full bg-emerald-500 text-white shadow-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* User Details */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verified Player</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                  {user.name}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start space-x-2 mt-1 font-semibold">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Coins Balance</span>
                  </div>
                  <p className="text-2xl font-extrabold mt-1">{user.coins}</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase">
                    <Trophy className="w-4 h-4 text-emerald-500" />
                    <span>Games Played</span>
                  </div>
                  <p className="text-2xl font-extrabold mt-1">24 Matches</p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 col-span-2 sm:col-span-1">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase">
                    <Calendar className="w-4 h-4 text-teal-500" />
                    <span>Member Since</span>
                  </div>
                  <p className="text-sm font-bold mt-2">July 2026</p>
                </div>
              </div>

              {/* Logout Action */}
              <div className="pt-4 flex justify-center md:justify-start">
                <button
                  onClick={logout}
                  className="px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-500/20 transition-all flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
