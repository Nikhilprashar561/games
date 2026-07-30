'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, AdminSettings } from '../types';
import { X, QrCode, Copy, Check, Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Wallet, Zap } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'DEPOSIT' | 'STATUS' | 'WITHDRAW';
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose, initialTab = 'DEPOSIT' }) => {
  const {
    user,
    submitDepositUTR,
    submitWithdrawal,
    fetchMyDeposits,
    fetchPublicPaymentConfig,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'STATUS' | 'WITHDRAW'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [config, setConfig] = useState<AdminSettings | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

  // Form states
  const [amount, setAmount] = useState<string>('500');
  const [utr, setUtr] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('200');
  const [withdrawDetails, setWithdrawDetails] = useState<string>('');
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedBank, setCopiedBank] = useState<boolean>(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss toast notification after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Transaction history state
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000];

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadHistory();
      if (user?.upiId) {
        setWithdrawDetails(user.upiId);
      }
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const cfg = await fetchPublicPaymentConfig();
      setConfig(cfg);
    } catch (e) {
      // ignore
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await fetchMyDeposits();
      setMyDeposits(list);
    } catch (e) {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    if (config?.upiId) {
      navigator.clipboard.writeText(config.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleOpenUPIApp = (e: React.MouseEvent, appName: string, customScheme?: string) => {
    e.preventDefault();
    const activeUpi = config?.upiId || '';
    if (!activeUpi) {
      setFeedback({
        type: 'error',
        message: 'Admin has not configured a payment UPI ID yet. Please scan QR code or contact support.',
      });
      return;
    }
    const numAmt = amount || '500';
    const upiUri = customScheme || `upi://pay?pa=${encodeURIComponent(activeUpi)}&pn=BaaziBoard&am=${numAmt}&cu=INR&tn=BaaziBoardDeposit`;

    // 1. Copy UPI ID automatically as fallback
    navigator.clipboard.writeText(activeUpi);
    setCopiedUpi(true);

    // 2. Detect mobile vs desktop
    const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = upiUri;
    } else {
      setFeedback({
        type: 'success',
        message: `⚡ ${appName} Selected! Copied UPI ID (${activeUpi}) & ₹${numAmt} to clipboard. Scan QR code or open ${appName} on your mobile phone to complete payment!`,
      });
    }
  };

  const handleCopyBank = () => {
    if (config?.accountNumber) {
      navigator.clipboard.writeText(`Bank: ${config.bankName}, A/C: ${config.accountNumber}, IFSC: ${config.ifscCode}`);
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmount = Number(amount);
    const cleanRef = utr.trim();

    if (!numAmount || numAmount < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid deposit amount (min ₹10)' });
      return;
    }

    if (!cleanRef || cleanRef.length < 6) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid 12-digit UTR / Reference ID from GPay / PhonePe / Paytm',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDepositUTR(numAmount, cleanRef, 'UPI_QR');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `🎉 Your request for ₹${numAmount} (Ref: ${cleanRef}) has been submitted! Your amount will be credited to your wallet under 10 minutes after verification.`,
        });
        setUtr('');
        loadHistory();
        setTimeout(() => setActiveTab('STATUS'), 1800);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deposit submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmount = Number(withdrawAmount);
    const cleanDetails = withdrawDetails.trim();

    if (!numAmount || numAmount < 100) {
      setFeedback({ type: 'error', message: 'Minimum withdrawal amount is ₹100' });
      return;
    }

    if (!cleanDetails || cleanDetails.length < 4) {
      setFeedback({ type: 'error', message: 'Please enter your UPI ID or Bank Account details' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitWithdrawal(numAmount, cleanDetails);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Withdrawal request for ₹${numAmount} submitted! Payout will be processed by Admin to ${cleanDetails}.`,
        });
        loadHistory();
        setTimeout(() => setActiveTab('STATUS'), 1800);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Withdrawal failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Ultra-Compact, Mobile-Fitted Responsive Modal Panel */}
      <div className="relative w-full max-w-lg sm:max-w-xl lg:max-w-2xl p-3.5 sm:p-5 lg:p-6 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[88vh] bg-[#0a0f1d] text-white my-auto flex flex-col">
        
        {/* Glow Accent */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2.5 mb-3 pr-6 flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-md text-white flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-['Space_Grotesk'] truncate">
              Baazi Board Cash Wallet
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-semibold truncate">
              Real Cash Balance: <span className="text-emerald-400 font-black">₹{formatCurrency(user?.walletBalance)}</span>
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-3 gap-1 text-xs flex-shrink-0">
          <button
            onClick={() => { setActiveTab('DEPOSIT'); setFeedback(null); }}
            className={`flex-1 py-2 px-1.5 rounded-lg font-black transition-all text-center flex items-center justify-center space-x-1 ${
              activeTab === 'DEPOSIT' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Deposit</span>
          </button>
          <button
            onClick={() => { setActiveTab('STATUS'); setFeedback(null); loadHistory(); }}
            className={`flex-1 py-2 px-1.5 rounded-lg font-black transition-all text-center flex items-center justify-center space-x-1 ${
              activeTab === 'STATUS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span>Status ({myDeposits.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('WITHDRAW'); setFeedback(null); }}
            className={`flex-1 py-2 px-1.5 rounded-lg font-black transition-all text-center flex items-center justify-center space-x-1 ${
              activeTab === 'WITHDRAW' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-teal-300" />
            <span>Withdraw</span>
          </button>
        </div>

        {/* Feedback Auto-Dismiss Alert Banner */}
        {feedback && (
          <div
            className={`mb-3 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between space-x-2 flex-shrink-0 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-0.5 text-slate-400 hover:text-white flex-shrink-0"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Tab Content Area */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3">

          {/* =================================================================== */}
          {/* TAB 1: INSTANT UPI DEPOSIT */}
          {/* =================================================================== */}
          {activeTab === 'DEPOSIT' && (
            <form onSubmit={handleDepositSubmit} className="space-y-3">
              
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                
                {/* QR + UPI Info Compact Grid */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Compact QR Image */}
                  {config?.isQrEnabled !== false && (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-white p-1 shadow-md flex-shrink-0 flex items-center justify-center">
                      <img
                        src={config?.qrCodeUrl || '/images/payment_qr.svg'}
                        alt="Baazi Board UPI QR"
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          if (config?.upiId) {
                            (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.upiId)}`;
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Copy UPI Details */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block mb-0.5">Official UPI ID:</span>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="font-extrabold text-emerald-400 text-xs truncate">{config?.upiId || 'Not Configured (Admin Panel)'}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="ml-2 px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex items-center space-x-1 flex-shrink-0"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {config?.isBankEnabled && config?.accountNumber && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold block mb-0.5">Direct Bank A/C:</span>
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px]">
                          <span className="truncate font-semibold text-slate-300">
                            {config?.bankName} &bull; {config?.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyBank}
                            className="ml-2 p-1 text-slate-400 hover:text-white"
                          >
                            {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* OFFICIAL VECTOR SVG BRAND LOGOS DEEP LINK BUTTONS */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>One-Tap Direct App Launcher:</span>
                    </span>
                    <span className="font-black text-emerald-400">Auto ₹{amount || 500}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {/* PhonePe */}
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(config?.upiId || '')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                      onClick={(e) => handleOpenUPIApp(e, 'PhonePe')}
                      className="p-2 rounded-xl bg-[#5F259F]/20 hover:bg-[#5F259F]/40 border border-[#5F259F]/50 text-white font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all shadow-sm cursor-pointer hover:scale-105"
                    >
                      <img src="/images/phone pe.png" alt="PhonePe" className="w-7 h-7 object-contain rounded-lg" />
                      <span className="font-bold">PhonePe</span>
                    </a>

                    {/* Google Pay */}
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(config?.upiId || '')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                      onClick={(e) => handleOpenUPIApp(e, 'Google Pay')}
                      className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-white font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all shadow-sm cursor-pointer hover:scale-105"
                    >
                      <img src="/images/google pay.png" alt="Google Pay" className="w-7 h-7 object-contain rounded-lg" />
                      <span className="font-bold">GPay</span>
                    </a>

                    {/* Paytm */}
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(config?.upiId || '')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                      onClick={(e) => handleOpenUPIApp(e, 'Paytm', `paytmmp://pay?pa=${encodeURIComponent(config?.upiId || '')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR`)}
                      className="p-2 rounded-xl bg-[#002E6E]/30 hover:bg-[#002E6E]/50 border border-[#00BAF2]/50 text-white font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all shadow-sm cursor-pointer hover:scale-105"
                    >
                      <img src="/images/paytm.jpeg" alt="Paytm" className="w-7 h-7 object-contain rounded-lg" />
                      <span className="font-bold">Paytm</span>
                    </a>

                    {/* BHIM */}
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(config?.upiId || '')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                      onClick={(e) => handleOpenUPIApp(e, 'BHIM / UPI')}
                      className="p-2 rounded-xl bg-[#008853]/20 hover:bg-[#008853]/40 border border-[#008853]/50 text-white font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all shadow-sm cursor-pointer hover:scale-105"
                    >
                      <img src="/images/bhim.png" alt="BHIM" className="w-7 h-7 object-contain rounded-lg" />
                      <span className="font-bold">BHIM</span>
                    </a>
                  </div>
                </div>

              </div>

              {/* Deposit Amount Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Deposit Amount (₹)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className={`py-2 text-xs font-black rounded-lg border transition-all ${
                        amount === String(amt)
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="10"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter Deposit Amount (e.g. 500)"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* UTR / Ref Input */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  12-Digit UTR / Ref ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 420918239012 (from PhonePe/Paytm/GPay receipt)"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-wider placeholder:font-sans placeholder:text-slate-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying UTR...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ Submit UTR & Auto-Credit (₹{amount || 0})</span>
                  </>
                )}
              </button>

            </form>
          )}

          {/* =================================================================== */}
          {/* TAB 2: STATUS */}
          {/* =================================================================== */}
          {activeTab === 'STATUS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-extrabold text-slate-200 uppercase tracking-wider">
                  Transaction History
                </h3>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-1 text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-400 mt-2">Loading...</p>
                </div>
              ) : myDeposits.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myDeposits.map((req) => (
                    <div
                      key={req._id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className={req.type === 'DEPOSIT' ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                          {req.type === 'DEPOSIT' ? '➕ Deposit' : '➖ Withdrawal'} ₹{req.amount}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {req.utr}</div>
                      </div>

                      <div>
                        {req.status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                            Pending
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                            Approved
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: WITHDRAW CASH */}
          {/* =================================================================== */}
          {activeTab === 'WITHDRAW' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Available Real Cash</span>
                <span className="text-2xl font-black text-emerald-400 font-['Space_Grotesk']">
                  ₹{formatCurrency(user?.walletBalance)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter Amount (min ₹100)"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Your UPI ID or Bank Account
                </label>
                <input
                  type="text"
                  required
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  placeholder="e.g. user@paytm or HDFC A/C: 50100..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Submit Cash Withdrawal Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer Security Badge */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 flex-shrink-0">
          <span className="flex items-center space-x-1 text-emerald-400 font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Safe Instant UTR Verification</span>
          </span>
          <span className="hidden sm:inline font-semibold">Baazi Board eSports</span>
        </div>

      </div>
    </div>
  );
};
