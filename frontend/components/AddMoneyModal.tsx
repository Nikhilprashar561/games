'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, AdminSettings } from '../types';
import { X, QrCode, Copy, Check, Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Wallet, Download, Zap, Coins } from 'lucide-react';
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
  const [depositMethod, setDepositMethod] = useState<'UPI' | 'CRYPTO'>('UPI');

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
  const [cryptoTxid, setCryptoTxid] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('200');
  const [withdrawDetails, setWithdrawDetails] = useState<string>('');
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedBank, setCopiedBank] = useState<boolean>(false);
  const [copiedCrypto, setCopiedCrypto] = useState<boolean>(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Transaction history state
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000];
  const DEFAULT_USDT_ADDRESS = 'TXb9KzR7pZ79Vb94N1mQW9xL2p88YkZ77';

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
    const activeUpi = config?.upiId || 'baaziboard@paytm';
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

  const handleCopyCrypto = () => {
    navigator.clipboard.writeText(DEFAULT_USDT_ADDRESS);
    setCopiedCrypto(true);
    setTimeout(() => setCopiedCrypto(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmount = Number(amount);
    const cleanRef = depositMethod === 'UPI' ? utr.trim() : cryptoTxid.trim();

    if (!numAmount || numAmount < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid deposit amount (min ₹10)' });
      return;
    }

    if (!cleanRef || cleanRef.length < 6) {
      setFeedback({
        type: 'error',
        message: depositMethod === 'UPI'
          ? 'Please enter a valid 12-digit UTR / Reference ID from GPay / PhonePe / Paytm'
          : 'Please enter a valid Transaction TXID / Hash',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDepositUTR(numAmount, cleanRef, depositMethod === 'UPI' ? 'UPI_QR' : 'CRYPTO_USDT');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Deposit request of ₹${numAmount} submitted! (Ref: ${cleanRef}). Auto-verification in progress.`,
        });
        setUtr('');
        setCryptoTxid('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Spacious, Fully Responsive Modal Container */}
      <div className="relative w-full max-w-xl sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-5 sm:p-8 lg:p-10 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0f1d] text-white my-auto flex flex-col max-h-[90vh]">
        
        {/* Glow Background Accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all z-20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6 pr-8 flex-shrink-0">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg text-white flex-shrink-0">
            <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight font-['Space_Grotesk'] truncate">
              Baazi Board Cash Wallet
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold truncate">
              Available Real Cash: <span className="text-emerald-400 font-extrabold">₹{formatCurrency(user?.walletBalance)}</span>
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6 gap-1 text-xs sm:text-sm flex-shrink-0">
          <button
            onClick={() => { setActiveTab('DEPOSIT'); setFeedback(null); }}
            className={`flex-1 py-2.5 sm:py-3 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center space-x-2 ${
              activeTab === 'DEPOSIT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Deposit Money</span>
          </button>
          <button
            onClick={() => { setActiveTab('STATUS'); setFeedback(null); loadHistory(); }}
            className={`flex-1 py-2.5 sm:py-3 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center space-x-2 ${
              activeTab === 'STATUS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>UTR Status ({myDeposits.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('WITHDRAW'); setFeedback(null); }}
            className={`flex-1 py-2.5 sm:py-3 px-2 rounded-xl font-extrabold transition-all text-center flex items-center justify-center space-x-2 ${
              activeTab === 'WITHDRAW' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 text-teal-300" />
            <span>Withdraw Cash</span>
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center space-x-3 flex-shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Tab Content Container */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-6">

          {/* =================================================================== */}
          {/* TAB 1: DEPOSIT MONEY (SUB-TABS: UPI VS CRYPTO) */}
          {/* =================================================================== */}
          {activeTab === 'DEPOSIT' && (
            <form onSubmit={handleDepositSubmit} className="space-y-6">
              
              {/* Payment Method Sub-Tab Switcher */}
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepositMethod('UPI')}
                  className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
                    depositMethod === 'UPI'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-950/60'
                  }`}
                >
                  <span>⚡ Tab 1: Instant UPI (GPay, PhonePe, Paytm, BHIM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositMethod('CRYPTO')}
                  className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
                    depositMethod === 'CRYPTO'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-950/60'
                  }`}
                >
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>🪙 Tab 2: USDT Crypto (Binance, CoinDCX, WazirX - TRC20)</span>
                </button>
              </div>

              {/* METHOD 1: INSTANT UPI QR / ID */}
              {depositMethod === 'UPI' && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                      <QrCode className="w-5 h-5 text-emerald-400" />
                      <span>Scan Official QR Code or Copy UPI ID</span>
                    </span>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                      0% Gateway Fee
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    {/* Large QR Code Display */}
                    {config?.isQrEnabled !== false && (
                      <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-white p-2 shadow-xl flex-shrink-0 flex items-center justify-center">
                        <img
                          src={config?.qrCodeUrl || '/images/payment_qr.svg'}
                          alt="Baazi Board UPI Payment QR"
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                              config?.upiId || 'baaziboard@paytm'
                            )}`;
                          }}
                        />
                      </div>
                    )}

                    {/* Copy Details */}
                    <div className="flex-1 w-full space-y-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">Official UPI ID:</span>
                        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="font-extrabold text-emerald-400 text-sm truncate">{config?.upiId || 'baaziboard@paytm'}</span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="ml-3 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex items-center space-x-1 flex-shrink-0"
                          >
                            {copiedUpi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                          </button>
                        </div>
                      </div>

                      {/* ONE-TAP DIRECT UPI APP DEEP LINK BUTTONS WITH BRAND LOGOS */}
                      <div className="pt-3 border-t border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-200 font-black uppercase tracking-wider flex items-center space-x-1.5">
                            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                            <span>One-Tap Direct Payment (Auto-Fills App):</span>
                          </span>
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Auto ₹{amount || 500} & UPI ID
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* PhonePe App Direct Button */}
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(config?.upiId || 'baaziboard@paytm')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                            onClick={(e) => handleOpenUPIApp(e, 'PhonePe')}
                            className="p-3 rounded-2xl bg-gradient-to-b from-[#5f259f]/30 to-[#3b1566]/40 hover:from-[#5f259f]/50 hover:to-[#3b1566]/60 border border-[#8534dc]/50 text-white font-extrabold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all shadow-lg hover:scale-105 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-xl bg-[#5f259f] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:rotate-6 transition-transform">
                              पे
                            </div>
                            <span className="text-[11px] font-extrabold tracking-wide">PhonePe</span>
                          </a>

                          {/* Google Pay App Direct Button */}
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(config?.upiId || 'baaziboard@paytm')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                            onClick={(e) => handleOpenUPIApp(e, 'Google Pay')}
                            className="p-3 rounded-2xl bg-gradient-to-b from-[#1a73e8]/30 to-[#0d47a1]/40 hover:from-[#1a73e8]/50 hover:to-[#0d47a1]/60 border border-[#4285f4]/50 text-white font-extrabold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all shadow-lg hover:scale-105 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-xl bg-[#1a73e8] flex items-center justify-center text-white font-black text-xs shadow-md group-hover:rotate-6 transition-transform">
                              GPay
                            </div>
                            <span className="text-[11px] font-extrabold tracking-wide">Google Pay</span>
                          </a>

                          {/* Paytm App Direct Button */}
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(config?.upiId || 'baaziboard@paytm')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                            onClick={(e) => handleOpenUPIApp(e, 'Paytm', `paytmmp://pay?pa=${encodeURIComponent(config?.upiId || 'baaziboard@paytm')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR`)}
                            className="p-3 rounded-2xl bg-gradient-to-b from-[#002e6e]/30 to-[#001838]/40 hover:from-[#002e6e]/50 hover:to-[#001838]/60 border border-[#00baf2]/50 text-white font-extrabold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all shadow-lg hover:scale-105 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-xl bg-[#002e6e] flex items-center justify-center text-[#00baf2] font-black text-xs shadow-md group-hover:rotate-6 transition-transform border border-[#00baf2]/40">
                              Paytm
                            </div>
                            <span className="text-[11px] font-extrabold tracking-wide">Paytm</span>
                          </a>

                          {/* BHIM / Any UPI App Direct Button */}
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(config?.upiId || 'baaziboard@paytm')}&pn=BaaziBoard&am=${amount || '500'}&cu=INR&tn=BaaziBoardDeposit`}
                            onClick={(e) => handleOpenUPIApp(e, 'BHIM / UPI')}
                            className="p-3 rounded-2xl bg-gradient-to-b from-[#008853]/30 to-[#004d2e]/40 hover:from-[#008853]/50 hover:to-[#004d2e]/60 border border-[#00b06b]/50 text-white font-extrabold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all shadow-lg hover:scale-105 group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-xl bg-[#008853] flex items-center justify-center text-amber-300 font-black text-xs shadow-md group-hover:rotate-6 transition-transform">
                              BHIM
                            </div>
                            <span className="text-[11px] font-extrabold tracking-wide">BHIM / Any</span>
                          </a>
                        </div>
                      </div>

                      {config?.isBankEnabled && config?.accountNumber && (
                        <div>
                          <span className="text-xs text-slate-400 font-bold block mb-1">Direct Bank Account:</span>
                          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="text-xs font-semibold text-slate-300 truncate">
                              <span>{config?.bankName}</span> &bull; <span>A/C: {config?.accountNumber}</span> {config?.ifscCode && `(${config.ifscCode})`}
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyBank}
                              className="ml-2 p-1 text-slate-400 hover:text-white"
                              title="Copy Bank Details"
                            >
                              {copiedBank ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD 2: USDT CRYPTO (TRC-20) */}
              {depositMethod === 'CRYPTO' && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <span>USDT (TRC-20) Binance / CoinDCX Deposit</span>
                    </span>
                    <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                      24/7 Unrestricted
                    </span>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs text-slate-400 font-bold block">Official USDT Wallet Address (TRC-20 Network):</span>
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm truncate">{DEFAULT_USDT_ADDRESS}</span>
                      <button
                        type="button"
                        onClick={handleCopyCrypto}
                        className="ml-3 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all flex items-center space-x-1 flex-shrink-0"
                      >
                        {copiedCrypto ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCrypto ? 'Copied' : 'Copy USDT'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      ⚠️ Send only USDT via TRC-20 network (Binance, CoinDCX, WazirX, KuCoin). Funds will auto-convert to wallet cash.
                    </p>
                  </div>
                </div>
              )}

              {/* Deposit Amount Selection */}
              <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                  Select Deposit Amount (₹)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className={`py-3 text-xs sm:text-sm font-black rounded-xl border transition-all ${
                        amount === String(amt)
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
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
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* UTR / Hash Input */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                  {depositMethod === 'UPI'
                    ? 'Enter 12-Digit UTR / Transaction Reference ID'
                    : 'Enter USDT Transaction Hash / TXID'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    depositMethod === 'UPI'
                      ? 'e.g. 420918239012 (found in Paytm/PhonePe receipt)'
                      : 'e.g. 8f92a10b... (found in Binance transaction details)'
                  }
                  value={depositMethod === 'UPI' ? utr : cryptoTxid}
                  onChange={(e) => depositMethod === 'UPI' ? setUtr(e.target.value.toUpperCase()) : setCryptoTxid(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-wider placeholder:font-sans placeholder:text-slate-500"
                />
              </div>

              {/* Submit Verification Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying UTR with UPI Network...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-amber-300" />
                    <span>⚡ Submit UTR & Auto-Verify Wallet Balance (₹{amount || 0})</span>
                  </>
                )}
              </button>

            </form>
          )}

          {/* =================================================================== */}
          {/* TAB 2: UTR STATUS & DEPOSIT HISTORY */}
          {/* =================================================================== */}
          {activeTab === 'STATUS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
                  Your Deposit & Withdrawal History
                </h3>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-400 mt-2">Loading transactions...</p>
                </div>
              ) : myDeposits.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No transactions found</p>
                  <p className="text-xs text-slate-500">Your deposit and withdrawal requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myDeposits.map((req) => (
                    <div
                      key={req._id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 font-black">
                          <span className={req.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-400'}>
                            {req.type === 'DEPOSIT' ? '➕ Deposit' : '➖ Withdrawal'} ₹{req.amount}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">Ref: {req.utr}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(req.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div>
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Admin</span>
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved</span>
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
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
            <form onSubmit={handleWithdrawSubmit} className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase">Available Real Cash Balance</span>
                <span className="text-3xl font-black text-emerald-400 font-['Space_Grotesk']">
                  ₹{formatCurrency(user?.walletBalance)}
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter Withdrawal Amount (min ₹100)"
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                  Your UPI ID or Bank Details (A/C & IFSC)
                </label>
                <input
                  type="text"
                  required
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  placeholder="e.g. user@paytm OR HDFC A/C: 50100234... IFSC: HDFC000123"
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Submit Cash Withdrawal Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span className="flex items-center space-x-1 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Safe Manual UTR Verification & Real Cash Payouts</span>
          </span>
          <span className="hidden sm:inline font-semibold">Baazi Board eSports Wallet</span>
        </div>

      </div>
    </div>
  );
};
