'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatCoins } from '../../utils/formatCurrency';
import { DepositRequest, AdminSettings, User } from '../../types';
import { Shield, Lock, Search, CheckCircle2, XCircle, Clock, RefreshCw, Save, QrCode, CreditCard, Users, ArrowUpRight, Check, AlertCircle, KeyRound, Sparkles, Upload, Image as ImageIcon, Coins, Wallet, PlusCircle, Trophy } from 'lucide-react';

export default function AdminPage() {
  const {
    adminLoginPasscode,
    fetchAdminDeposits,
    adminApproveDeposit,
    adminRejectDeposit,
    updateAdminConfig,
    fetchAdminStats,
    fetchPublicPaymentConfig,
    fetchAdminUsers,
    adminAdjustUserBalance,
    adminCreateTestDeposit,
    adminResetAllWallets,
    fetchAdminGameLogs,
  } = useAuth();

  // Auth & Passcode state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState<boolean>(false);

  // Tab & Data state
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'USERS' | 'SETTINGS' | 'LOGS'>('QUEUE');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [gameLogs, setGameLogs] = useState<any[]>([]);
  const [totalHouseCommission, setTotalHouseCommission] = useState<number>(0);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [loadingDeposits, setLoadingDeposits] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  // Gallery File Upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings form state
  const [configForm, setConfigForm] = useState<Partial<AdminSettings>>({
    qrCodeUrl: '/images/payment_qr.svg',
    upiId: '',
    upiHolderName: 'Baazi Board Official',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    minDeposit: 100,
    minWithdrawal: 200,
    adminPasscode: 'admin123',
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for rejection note
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Check saved session
    const storedToken = localStorage.getItem('admin_passcode_token');
    if (storedToken) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, statusFilter, searchQuery]);

  const loadDashboardData = async () => {
    setLoadingDeposits(true);
    try {
      const [list, statsData, cfg, usersData] = await Promise.all([
        fetchAdminDeposits(statusFilter, searchQuery),
        fetchAdminStats(),
        fetchPublicPaymentConfig(),
        fetchAdminUsers(),
      ]);
      setDeposits(list || []);
      if (statsData) setStats(statsData);
      if (usersData) setUsersList(usersData);
      if (cfg) {
        setConfigForm({
          qrCodeUrl: cfg.qrCodeUrl,
          upiId: cfg.upiId,
          upiHolderName: cfg.upiHolderName,
          bankName: cfg.bankName,
          accountNumber: cfg.accountNumber,
          ifscCode: cfg.ifscCode,
          minDeposit: cfg.minDeposit,
          minWithdrawal: cfg.minWithdrawal,
          adminPasscode: '',
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingDeposits(false);
    }
  };

  const loadUsersOnly = async () => {
    setLoadingUsers(true);
    try {
      const uList = await fetchAdminUsers();
      setUsersList(uList || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGameLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAdminGameLogs();
      if (data) {
        setGameLogs(data.logs || []);
        setTotalHouseCommission(data.totalAdminCommission || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthenticating(true);
    try {
      const ok = await adminLoginPasscode(passcode);
      if (ok) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Incorrect Passcode');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  // Gallery Image Upload Handler
  const handleQrGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setActionFeedback({ type: 'error', message: 'Please select a valid image file (PNG, JPG, JPEG, WEBP)' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setConfigForm((prev) => ({ ...prev, qrCodeUrl: base64Url }));
        setActionFeedback({
          type: 'success',
          message: 'QR Code image loaded from gallery! Click "Save Admin Payment Settings" below to publish it live to all users.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApprove = async (reqId: string) => {
    setActionFeedback(null);
    setProcessingId(reqId);
    try {
      const res = await adminApproveDeposit(reqId);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        loadDashboardData();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Approval failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    setActionFeedback(null);
    setProcessingId(rejectingId);
    try {
      const res = await adminRejectDeposit(rejectingId, rejectReason);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        setRejectingId(null);
        setRejectReason('');
        loadDashboardData();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Rejection failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    setSavingConfig(true);
    try {
      const updated = await updateAdminConfig(configForm);
      setActionFeedback({ type: 'success', message: 'Payment details & gallery QR code saved live to MongoDB!' });
      setConfigForm((prev) => ({ ...prev, ...updated, adminPasscode: '' }));
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to update admin config' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAdjustBalance = async (userId: string, type: 'REAL' | 'DEMO', delta: number) => {
    setActionFeedback(null);
    try {
      const res = await adminAdjustUserBalance(userId, type, delta);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        loadUsersOnly();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Balance adjustment failed' });
    }
  };

  const handleGenerateTestDeposit = async (testAmt: number = 500) => {
    setActionFeedback(null);
    try {
      const res = await adminCreateTestDeposit(testAmt);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        setStatusFilter('PENDING');
        loadDashboardData();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to create test deposit' });
    }
  };

  const handleResetAllWallets = async () => {
    if (!window.confirm('Are you sure you want to clear real cash balance (₹0) for ALL users in the database?')) {
      return;
    }
    setActionFeedback(null);
    try {
      const res = await adminResetAllWallets();
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        loadUsersOnly();
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to reset all wallets' });
    }
  };

  // PASSCODE AUTH SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md p-5 sm:p-8 glass-panel rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0f1d] text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 shadow-lg shadow-amber-500/30 text-white">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
              Admin Verification Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Enter Admin Passcode to verify UTR payments & manage QR code
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Security Passcode
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Default Passcode: admin123"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-3.5 sm:py-4 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all text-sm flex items-center justify-center space-x-2"
            >
              <span>{authenticating ? 'Authenticating...' : 'Unlock Admin Portal 🔐'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] font-bold text-slate-500">
            💡 Default Passcode is <code className="text-amber-400 font-mono">admin123</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl bg-[#0a0f1d]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-2xl font-black text-white font-['Space_Grotesk']">Admin Verification Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase hidden sm:inline-block">
                Live Portal
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-semibold">
              Verify 12-digit UTR payment transactions, upload QR code & distribute player balances
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <button
            onClick={loadDashboardData}
            className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDeposits ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('admin_passcode_token');
              setIsAuthenticated(false);
            }}
            className="px-3 sm:px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition-all flex items-center space-x-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-white font-['Space_Grotesk']">
              {stats?.totalUsers || usersList.length || 0}
            </span>
            <span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Online Players</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-400 font-['Space_Grotesk']">
              {stats?.onlineUsersCount || Math.max(1, (stats?.totalUsers || usersList.length || 0) - 1)}
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Currently Playing</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-300 font-['Space_Grotesk']">
              {stats?.activeGamesCount || 4}
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">House Commission</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-400 font-['Space_Grotesk']">
              ₹{formatCurrency(totalHouseCommission || stats?.netRevenue || 0)}
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <Trophy className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending UTRs</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-400 font-['Space_Grotesk']">
              {stats?.pendingCount || 0}
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center animate-pulse">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-white font-['Space_Grotesk']">
              ₹{formatCurrency(stats?.totalDepositAmount || 0)}
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              ₹
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-extrabold overflow-x-auto">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 flex-shrink-0 ${
            activeTab === 'QUEUE'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>UTR Verification Queue ({deposits.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('USERS'); loadUsersOnly(); }}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 flex-shrink-0 ${
            activeTab === 'USERS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Player Accounts & Balance Manager ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 flex-shrink-0 ${
            activeTab === 'SETTINGS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Gallery QR Code Upload & UPI Settings</span>
        </button>

        <button
          onClick={() => { setActiveTab('LOGS'); loadGameLogs(); }}
          className={`pb-3 transition-colors flex items-center space-x-2 border-b-2 flex-shrink-0 ${
            activeTab === 'LOGS'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Customer Betting & Game Logs</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center space-x-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* TAB 1: UTR VERIFICATION QUEUE */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-6">
          
          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Status Filters */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold w-full md:w-auto">
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* UTR Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search UTR ID or User Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

          </div>

          {/* Table of Deposit & Withdrawal Requests */}
          <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0f1d]">
            {loadingDeposits ? (
              <div className="py-16 text-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 mt-3 font-semibold">Loading UTR requests...</p>
              </div>
            ) : deposits.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Clock className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-base font-bold text-slate-300">No deposit requests found in this view</p>
                <button
                  onClick={() => handleGenerateTestDeposit(500)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Test ₹500 Deposit Request</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 uppercase text-[11px] font-extrabold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4">User Details</th>
                      <th className="py-4 px-4">Type & Amount</th>
                      <th className="py-4 px-4">UTR / Transaction ID</th>
                      <th className="py-4 px-4">Submitted Date</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {deposits.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-white text-sm">{req.userName}</div>
                          <div className="text-slate-400 text-xs">{req.userEmail}</div>
                          {req.upiOrBankDetails && (
                            <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
                              Payout Info: {req.upiOrBankDetails}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`font-black text-sm ${req.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {req.type === 'DEPOSIT' ? '➕ Deposit' : '➖ Withdrawal'} ₹{req.amount}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{req.paymentMethod}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs inline-block">
                            {req.utr}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-semibold text-slate-400">
                          {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>

                        <td className="py-4 px-4">
                          {req.status === 'PENDING' && (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleApprove(req._id)}
                                disabled={processingId === req._id}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve UTR</span>
                              </button>

                              <button
                                onClick={() => setRejectingId(req._id)}
                                disabled={processingId === req._id}
                                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-extrabold text-xs transition-all flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-semibold text-xs">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLAYER ACCOUNTS & BALANCE MANAGER */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk']">Registered Player Accounts</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Directly distribute Demo Coins or Real Cash balance to any player account
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetAllWallets}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center space-x-1"
                title="Reset real money balance to 0 for ALL users"
              >
                <span>🧹 Clear All Real Cash (₹0)</span>
              </button>

              <button
                onClick={loadUsersOnly}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh Players</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0f1d]">
            {loadingUsers ? (
              <div className="py-16 text-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 mt-3 font-semibold">Loading player accounts...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-300">No registered players yet</p>
                <p className="text-xs text-slate-500 mt-1">Users will appear here as soon as they log in with their email.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 uppercase text-[11px] font-extrabold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4">Player Profile</th>
                      <th className="py-4 px-4">Real Cash Wallet (₹)</th>
                      <th className="py-4 px-4">Demo Coins (🪙)</th>
                      <th className="py-4 px-4">Joined Date</th>
                      <th className="py-4 px-4 text-right">Distribute / Adjust Balances</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {usersList.map((u) => (
                      <tr key={u.id || (u as any)._id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full bg-emerald-500/20" />
                            <div>
                              <div className="font-extrabold text-white text-sm">{u.name}</div>
                              <div className="text-slate-400 text-xs">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-black text-sm text-emerald-400">
                          ₹{formatCurrency(u.walletBalance)}
                        </td>

                        <td className="py-4 px-4 font-black text-sm text-amber-400">
                          🪙 {formatCoins(u.demoBalance !== undefined ? u.demoBalance : 1000)}
                        </td>

                        <td className="py-4 px-4 font-semibold text-slate-400">
                          {new Date((u as any).createdAt || Date.now()).toLocaleDateString('en-IN')}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                            
                            {/* Custom Amount Input Box */}
                            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                              <span className="text-[11px] font-black text-emerald-400 pl-1">₹</span>
                              <input
                                type="number"
                                placeholder="Amount"
                                value={customAmounts[u.id || (u as any)._id] || ''}
                                onChange={(e) => setCustomAmounts({ ...customAmounts, [u.id || (u as any)._id]: e.target.value })}
                                className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />

                              <button
                                onClick={() => {
                                  const amt = Number(customAmounts[u.id || (u as any)._id]) || 500;
                                  handleAdjustBalance(u.id || (u as any)._id, 'REAL', amt);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] shadow-sm flex items-center space-x-1"
                                title="Add custom amount to user's real cash wallet"
                              >
                                <PlusCircle className="w-3 h-3" />
                                <span>+ Add Cash</span>
                              </button>

                              <button
                                onClick={() => {
                                  const amt = Number(customAmounts[u.id || (u as any)._id]) || 0;
                                  handleAdjustBalance(u.id || (u as any)._id, 'SET_REAL_EXACT' as any, amt);
                                }}
                                className="px-2 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-extrabold text-[11px]"
                                title="Set exact wallet balance"
                              >
                                Set Exact
                              </button>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleAdjustBalance(u.id || (u as any)._id, 'SET_REAL_ZERO' as any, 0)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700"
                                title="Reset wallet balance to ₹0"
                              >
                                Reset ₹0
                              </button>

                              <button
                                onClick={() => {
                                  const amt = Number(customAmounts[u.id || (u as any)._id]) || 1000;
                                  handleAdjustBalance(u.id || (u as any)._id, 'DEMO', amt);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-extrabold text-[11px]"
                                title="Add demo coins"
                              >
                                + 🪙 1,000 Demo
                              </button>
                            </div>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 glass-panel rounded-3xl border border-slate-800 bg-[#0a0f1d] text-white">
            <h3 className="text-lg font-black text-white mb-2 font-['Space_Grotesk']">Reject UTR Request</h3>
            <p className="text-xs text-slate-400 mb-4 font-semibold">
              Enter reason for rejecting this UTR/transaction submission:
            </p>

            <input
              type="text"
              placeholder="e.g. Invalid 12-digit UTR or amount mismatch"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-semibold mb-4 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GALLERY QR CODE UPLOAD & SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveConfig} className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0f1d] space-y-6">
          
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk']">Gallery QR Code Upload & Gateway Details</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Upload your payment QR image directly from your gallery or file browser!
              </p>
            </div>
          </div>

          {/* GALLERY QR CODE UPLOAD BOX */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              1. Gallery QR Code Image Picker
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* QR Image Preview */}
              <div className="w-36 h-36 rounded-2xl bg-white p-2 border-2 border-amber-500/40 shadow-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={configForm.qrCodeUrl || '/images/payment_qr.svg'}
                  alt="Admin Payment QR Preview"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      configForm.upiId || 'baaziboard@paytm'
                    )}`;
                  }}
                />
              </div>

              {/* Upload Button & Info */}
              <div className="space-y-3 flex-1">
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                  Select your Official Paytm / PhonePe / GPay QR code image from your device gallery. It will automatically convert and display in every customer's Add Money Scanner!
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleQrGalleryFileSelect}
                  className="hidden"
                />

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload QR from Gallery 🖼️</span>
                  </button>

                  <span className="text-[11px] text-slate-500 font-bold">
                    Supports PNG, JPG, WEBP
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* QR Code Image Path input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                QR Code Image Path / Base64 Data
              </label>
              <input
                type="text"
                required
                value={configForm.qrCodeUrl}
                onChange={(e) => setConfigForm({ ...configForm, qrCodeUrl: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Official UPI ID */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Admin UPI ID
              </label>
              <input
                type="text"
                required
                value={configForm.upiId}
                onChange={(e) => setConfigForm({ ...configForm, upiId: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* UPI Holder Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                UPI Account Holder Name (Optional)
              </label>
              <input
                type="text"
                value={configForm.upiHolderName || ''}
                onChange={(e) => setConfigForm({ ...configForm, upiHolderName: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Bank Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank (Optional)"
                value={configForm.bankName || ''}
                onChange={(e) => setConfigForm({ ...configForm, bankName: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Bank Account Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 50100234567890 (Optional)"
                value={configForm.accountNumber || ''}
                onChange={(e) => setConfigForm({ ...configForm, accountNumber: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                IFSC Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234 (Optional)"
                value={configForm.ifscCode || ''}
                onChange={(e) => setConfigForm({ ...configForm, ifscCode: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Payment Method Active Toggles */}
            <div className="md:col-span-2 pt-4 border-t border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                Enable / Disable Payment Methods For Clients
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-amber-500/50 transition-all">
                  <input
                    type="checkbox"
                    checked={configForm.isQrEnabled !== false}
                    onChange={(e) => setConfigForm({ ...configForm, isQrEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-white block">Enable QR Code & UPI Scanner</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Allow players to pay via UPI QR code scanner</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-amber-500/50 transition-all">
                  <input
                    type="checkbox"
                    checked={!!configForm.isBankEnabled}
                    onChange={(e) => setConfigForm({ ...configForm, isBankEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-white block">Enable Direct Bank Transfer Details</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Display Bank Account No. & IFSC code to players</span>
                  </div>
                </label>

              </div>
            </div>

            {/* Change Admin Security Passcode */}
            <div className="md:col-span-2 pt-4 border-t border-slate-800">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                Change Admin Security Passcode (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep current passcode (default: admin123)"
                value={configForm.adminPasscode}
                onChange={(e) => setConfigForm({ ...configForm, adminPasscode: e.target.value })}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all text-xs flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{savingConfig ? 'Saving Changes...' : 'Save Admin Payment Settings 💾'}</span>
          </button>

        </form>
      )}

      {/* TAB 4: CUSTOMER BETTING & MATCH HISTORY LOGS */}
      {activeTab === 'LOGS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk']">Customer Betting & Match Logs</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Complete audit history of customer game matches, entry fees, winnings, and admin house commission
              </p>
            </div>
            <button
              onClick={loadGameLogs}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Revenue Summary Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg">
                ₹
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total House Commission Collected</span>
                <span className="text-xl font-black text-emerald-400 font-['Space_Grotesk']">₹{totalHouseCommission}</span>
              </div>
            </div>
            <div className="text-right text-xs font-bold text-slate-400">
              <span>Recorded Matches: </span>
              <span className="text-white font-black">{gameLogs.length}</span>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0f1d]">
            {loadingLogs ? (
              <div className="py-16 text-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 mt-3 font-semibold">Loading betting history...</p>
              </div>
            ) : gameLogs.length === 0 ? (
              <div className="py-16 text-center">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-300">No customer betting logs yet</p>
                <p className="text-xs text-slate-500 mt-1">Logs will automatically appear here as customers play real cash or demo games.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 uppercase text-[11px] font-extrabold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4">Customer</th>
                      <th className="py-4 px-4">Game Played</th>
                      <th className="py-4 px-4">Mode</th>
                      <th className="py-4 px-4">Entry Fee</th>
                      <th className="py-4 px-4">Outcome</th>
                      <th className="py-4 px-4">Player Payout</th>
                      <th className="py-4 px-4">Admin Cut (House)</th>
                      <th className="py-4 px-4">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {gameLogs.map((log: any, idx: number) => (
                      <tr key={log._id || log.id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          <div>{log.userName || 'Gamer'}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{log.userEmail}</div>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-200">
                          {log.gameTitle || log.gameSlug}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.playMode === 'REAL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {log.playMode || 'REAL'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-black text-slate-300">
                          {log.playMode === 'REAL' ? `₹${log.entryFee || 10}` : `🪙${log.entryFee || 100}`}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            log.result === 'WIN' ? 'bg-emerald-600 text-white' : log.result === 'LOSS' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-black text-emerald-400">
                          {log.playMode === 'REAL' ? `₹${log.amountWon || 0}` : `🪙${log.amountWon || 0}`}
                        </td>
                        <td className="py-4 px-4 font-black text-amber-400">
                          {log.playMode === 'REAL' ? `+₹${log.adminCommission || 0}` : `0`}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-400">
                          {new Date(log.playedAt || Date.now()).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
