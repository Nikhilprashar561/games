'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { User as UserIcon, Wallet, ShieldCheck, ArrowLeft, Gamepad2, BarChart3, Filter, PlusCircle, Edit2, Mail, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { GameMatchLog, GameStats } from '../../types';
import { gamesData } from '../../data/gamesData';
import { AddMoneyModal } from '../../components/AddMoneyModal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const { user, fetchMatchHistory, updateName, requestEmailChange, verifyEmailChange } = useAuth();
  const [selectedGameSlug, setSelectedGameSlug] = useState<string>('all');
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState<boolean>(false);
  
  // Profile Editing State
  const [editingName, setEditingName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Update with 4-Digit OTP State
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailOtp, setEmailOtp] = useState<string>('');
  const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState<boolean>(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [stats, setStats] = useState<GameStats>({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    totalWon: 0,
    totalSpent: 0,
    netEarnings: 0,
  });
  const [logs, setLogs] = useState<GameMatchLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (user?.name) setEditingName(user.name);
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const slugArg = selectedGameSlug === 'all' ? undefined : selectedGameSlug;
      const data = await fetchMatchHistory(slugArg);
      setStats(data.stats);
      setLogs(data.logs);
      setLoading(false);
    };

    loadData();
  }, [selectedGameSlug]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName.trim()) return;
    setIsSavingName(true);
    setNameMsg(null);
    try {
      await updateName(editingName.trim());
      setNameMsg({ type: 'success', text: 'Display name updated successfully!' });
      setTimeout(() => setNameMsg(null), 3000);
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err.message || 'Failed to update name' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRequestEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid new email address' });
      return;
    }
    setIsSendingEmailOtp(true);
    setEmailMsg(null);
    try {
      await requestEmailChange(cleanEmail);
      setEmailStep('verify');
      setEmailMsg({ type: 'success', text: `4-Digit OTP sent to ${cleanEmail}. Check your inbox!` });
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Failed to send verification OTP' });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.length < 4) {
      setEmailMsg({ type: 'error', text: 'Please enter the 4-digit verification OTP' });
      return;
    }
    setIsSendingEmailOtp(true);
    setEmailMsg(null);
    try {
      await verifyEmailChange(newEmail.trim(), emailOtp.trim());
      setEmailMsg({ type: 'success', text: 'Email updated successfully!' });
      setEmailStep('request');
      setNewEmail('');
      setEmailOtp('');
      setTimeout(() => setEmailMsg(null), 3500);
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Invalid OTP code' });
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const selectedGameInfo = gamesData.find((g) => g.slug === selectedGameSlug);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena Home</span>
        </Link>

        {/* Top Header Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden bg-[#0a0f1d] text-white">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            
            <div className="flex items-center space-x-5">
              <div className="relative">
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-20 h-20 rounded-2xl bg-emerald-500/20 p-1 border-2 border-emerald-500/40 shadow-xl"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
              </div>

              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Account ({user?.isVerified ? 'OTP Verified ✅' : 'Verified'})</span>
                </div>
                <h1 className="text-3xl font-black text-white font-['Space_Grotesk']">
                  {user?.name}
                </h1>
                <p className="text-sm font-semibold text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Wallet & Topup Button */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center min-w-[180px]">
                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-400 uppercase">
                  <Wallet className="w-4 h-4" />
                  <span>Real Money Wallet</span>
                </div>
                <p className="text-3xl font-black text-emerald-400 mt-1 font-['Space_Grotesk']">
                  ₹{user?.walletBalance || 500}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  UPI: {user?.upiId || 'user@paytm'}
                </p>
              </div>

              <button
                onClick={() => setIsAddMoneyOpen(true)}
                className="px-6 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all flex flex-col items-center justify-center space-y-1"
              >
                <PlusCircle className="w-6 h-6" />
                <span>Add Money</span>
              </button>
            </div>

          </div>
        </div>

        {/* Account Profile Settings: Update Name & Change Email with OTP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Update Display Name */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl bg-[#0a0f1d] text-white space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Edit2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black font-['Space_Grotesk']">Update Display Name</h2>
            </div>

            {nameMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                nameMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {nameMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{nameMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Current Display Name</label>
                <input
                  type="text"
                  required
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingName}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
              >
                {isSavingName ? 'Saving...' : 'Save New Display Name ✨'}
              </button>
            </form>
          </div>

          {/* Card 2: Update Email Address with 4-Digit OTP Verification */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl bg-[#0a0f1d] text-white space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black font-['Space_Grotesk']">Update Email (OTP Verified)</h2>
            </div>

            {emailMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                emailMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {emailMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{emailMsg.text}</span>
              </div>
            )}

            {emailStep === 'request' ? (
              <form onSubmit={handleRequestEmailOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">New Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="newemail@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-amber-400 mt-1 font-semibold">
                    💡 A 4-digit verification OTP code will be sent to your new email.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSendingEmailOtp}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                >
                  {isSendingEmailOtp ? 'Sending OTP...' : 'Send 4-Digit OTP to New Email 📩'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Enter 4-Digit OTP sent to {newEmail}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="1234"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-lg tracking-widest text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEmailStep('request')}
                    className="w-1/3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmailOtp || emailOtp.length < 4}
                    className="w-2/3 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md text-sm transition-all disabled:opacity-50"
                  >
                    {isSendingEmailOtp ? 'Verifying...' : 'Verify OTP & Update Email 🚀'}
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

        {/* Game Filter Selector Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-extrabold text-white font-['Space_Grotesk']">
              <Filter className="w-4 h-4 text-emerald-500" />
              <span>Select Game Dashboard View:</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedGameSlug('all')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all border ${
                selectedGameSlug === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/40'
              }`}
            >
              🎮 All Games Overview
            </button>

            {gamesData
              .filter((g) => g.slug !== 'tic-tac-toe')
              .map((game) => (
                <button
                  key={game.slug}
                  onClick={() => setSelectedGameSlug(game.slug)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all border ${
                    selectedGameSlug === game.slug
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                  }`}
                >
                  {game.title}
                </button>
              ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl space-y-8 bg-[#0a0f1d] text-white">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>
                  {selectedGameSlug === 'all' ? 'Overall Real Money Match Performance' : `${selectedGameInfo?.title} Analytics`}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Space_Grotesk']">
                {selectedGameSlug === 'all' ? 'All Games Performance Dashboard' : `${selectedGameInfo?.title} Record`}
              </h2>
            </div>

            {selectedGameInfo && (
              <div className="flex items-center space-x-3 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
                <img
                  src={selectedGameInfo.image}
                  alt={selectedGameInfo.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <p className="text-xs font-extrabold text-white">{selectedGameInfo.title}</p>
                  <p className="text-[11px] font-bold text-emerald-500">{selectedGameInfo.category}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Total Matches</p>
              <p className="text-3xl font-black text-white mt-1 font-['Space_Grotesk']">
                {stats.totalMatches}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Completed Matches</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-xs font-bold text-emerald-400 uppercase">Win Rate</p>
              <p className="text-3xl font-black text-emerald-400 mt-1 font-['Space_Grotesk']">
                {stats.winRate}%
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">{stats.wins} Wins / {stats.losses} Losses</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-xs font-bold text-amber-500 uppercase">Total Won</p>
              <p className="text-3xl font-black text-amber-500 mt-1 font-['Space_Grotesk']">
                +₹{stats.totalWon}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Earned Wallet Rewards</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Net Earnings</p>
              <p className={`text-3xl font-black mt-1 font-['Space_Grotesk'] ${
                stats.netEarnings >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {stats.netEarnings >= 0 ? `+₹${stats.netEarnings}` : `₹${stats.netEarnings}`}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Profit/Loss</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
              Detailed Match History Log
            </h3>

            {loading ? (
              <p className="text-sm font-semibold text-slate-400 py-8 text-center">Loading game analytics...</p>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                <Gamepad2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-300">
                  No match logs recorded yet for this selection.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Play matches in Chess, Snake & Ladder, Teen Patti, Carrom, Ludo, or Number Predict to record analytics!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-900 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Game</th>
                      <th className="py-3.5 px-4">Opponent</th>
                      <th className="py-3.5 px-4">Result</th>
                      <th className="py-3.5 px-4">Stake</th>
                      <th className="py-3.5 px-4">Won</th>
                      <th className="py-3.5 px-4">Net Money</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {log.gameTitle}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {log.opponentName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                            log.result === 'WIN'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : log.result === 'LOSS'
                              ? 'bg-rose-500/20 text-rose-500'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          ₹{log.amountSpent}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-500">
                          +₹{log.amountWon}
                        </td>
                        <td className={`py-3.5 px-4 font-black ${
                          log.netAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {log.netAmount >= 0 ? `+₹${log.netAmount}` : `₹${log.netAmount}`}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {new Date(log.playedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>
      <AddMoneyModal isOpen={isAddMoneyOpen} onClose={() => setIsAddMoneyOpen(false)} />
    </ProtectedRoute>
  );
}
