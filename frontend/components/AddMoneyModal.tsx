'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, WithdrawalRequest, WalletTransaction, AdminSettings } from '../types';
import {
  X,
  QrCode,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Wallet,
  Zap,
  Upload,
  Image as ImageIcon,
  Eye,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { ProofLightboxModal } from './ProofLightboxModal';
import { SlaCountdownTimer } from './SlaCountdownTimer';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'DEPOSIT' | 'STATUS' | 'WITHDRAW' | 'TRANSACTIONS';
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose, initialTab = 'DEPOSIT' }) => {
  const {
    user,
    submitDepositUTR,
    submitWithdrawal,
    fetchMyDeposits,
    fetchMyWithdrawals,
    fetchMyTransactions,
    fetchPublicPaymentConfig,
    showToast,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'STATUS' | 'WITHDRAW' | 'TRANSACTIONS'>(initialTab);

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
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [depositScreenshot, setDepositScreenshot] = useState<string>('');
  const [depositScreenshotPreview, setDepositScreenshotPreview] = useState<string>('');

  const [withdrawAmount, setWithdrawAmount] = useState<string>('200');
  const [withdrawDetails, setWithdrawDetails] = useState<string>('');
  const [withdrawQrCode, setWithdrawQrCode] = useState<string>('');
  const [securityPin, setSecurityPin] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedBank, setCopiedBank] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History & Audit states
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [myTransactions, setMyTransactions] = useState<WalletTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Lightbox Modal state
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    title: string;
    imageUrl: string;
    utr?: string;
    amount?: number;
    note?: string;
  }>({ isOpen: false, title: '', imageUrl: '' });

  const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000];

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadAllHistories();
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

  const loadAllHistories = async () => {
    setLoadingHistory(true);
    try {
      const [deps, wds, txs] = await Promise.all([
        fetchMyDeposits(),
        fetchMyWithdrawals(),
        fetchMyTransactions(),
      ]);
      setMyDeposits(deps);
      setMyWithdrawals(wds);
      setMyTransactions(txs);
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

  // Launch installed UPI Application directly with pre-filled amount and target UPI ID
  const handleLaunchUpiApp = (appName: string, packageScheme?: string) => {
    setFeedback(null);
    const numAmt = Number(amount);
    const minRequired = config?.minDeposit || 10;

    if (!numAmt || numAmt < minRequired) {
      setFeedback({
        type: 'error',
        message: `Please enter a valid deposit amount of at least ₹${minRequired}`,
      });
      return;
    }

    const targetUpiId = config?.upiId;
    if (!targetUpiId) {
      setFeedback({
        type: 'error',
        message: 'Admin UPI Payment ID is not configured in database. Please contact support.',
      });
      return;
    }
    const merchantName = 'BaaziBoard';

    // Standard UPI deep link specification (pre-fills payee UPI ID, payee name, amount, currency)
    const standardUpiUri = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${numAmt}&cu=INR`;

    let appSpecificUri = standardUpiUri;
    if (packageScheme === 'phonepe') {
      appSpecificUri = `phonepe://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${numAmt}&cu=INR`;
    } else if (packageScheme === 'gpay') {
      appSpecificUri = `tez://upi/pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${numAmt}&cu=INR`;
    } else if (packageScheme === 'paytm') {
      appSpecificUri = `paytmmp://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${numAmt}&cu=INR`;
    } else if (packageScheme === 'bhim') {
      appSpecificUri = `bhim://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${numAmt}&cu=INR`;
    }

    try {
      // Trigger deep link navigation
      window.location.href = appSpecificUri;

      // Fallback timer: if app-specific scheme is not handled, fall back to standard upi:// scheme
      if (packageScheme && packageScheme !== 'generic') {
        setTimeout(() => {
          window.location.href = standardUpiUri;
        }, 1000);
      }
    } catch (err) {
      window.location.href = standardUpiUri;
    }
  };

  // Image Upload File Handler (Deposit Screenshot)
  const handleDepositImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size should be under 8MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setDepositScreenshot(base64Str);
      setDepositScreenshotPreview(base64Str);
    };
    reader.readAsDataURL(file);
  };

  // Image Upload File Handler (User QR Code for Withdrawal)
  const handleWithdrawQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setWithdrawQrCode(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmt = Number(amount);
    if (!numAmt || numAmt < (config?.minDeposit || 10)) {
      setFeedback({ type: 'error', message: `Minimum deposit amount is ₹${config?.minDeposit || 10}` });
      return;
    }

    const cleanUtr = utr.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length !== 12) {
      setFeedback({ type: 'error', message: 'Please enter a valid 12-digit transaction reference number' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDepositUTR(numAmt, cleanUtr, 'UPI_QR', depositScreenshot, paymentTime);
      setFeedback({ type: 'success', message: res.message });
      setUtr('');
      setDepositScreenshot('');
      setDepositScreenshotPreview('');
      loadAllHistories();
      setTimeout(() => {
        setActiveTab('STATUS');
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deposit submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmt = Number(withdrawAmount);
    if (!numAmt || numAmt < (config?.minWithdrawal || 100)) {
      setFeedback({ type: 'error', message: `Minimum withdrawal amount is ₹${config?.minWithdrawal || 100}` });
      return;
    }

    if ((user?.walletBalance || 0) < numAmt) {
      setFeedback({ type: 'error', message: `Insufficient wallet balance (Current: ₹${user?.walletBalance || 0})` });
      return;
    }

    if (!withdrawDetails.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid UPI ID or Bank details' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitWithdrawal(numAmt, withdrawDetails.trim(), withdrawQrCode, securityPin);
      setFeedback({ type: 'success', message: res.message });
      setWithdrawAmount('200');
      setWithdrawQrCode('');
      setSecurityPin('');
      loadAllHistories();
      setTimeout(() => {
        setActiveTab('STATUS');
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Withdrawal submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                Trust Payments & Wallet
              </h3>
              <p className="text-xs text-slate-400">Verified UPI Deposits & 4-Hour SLA Payouts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 text-xs font-bold font-['Space_Grotesk']">
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'DEPOSIT'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Add Money</span>
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'WITHDRAW'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          <button
            onClick={() => setActiveTab('STATUS')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'STATUS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Requests ({myDeposits.length + myWithdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Log</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: ADD MONEY / DEPOSIT */}
          {activeTab === 'DEPOSIT' && (
            <div className="space-y-5">
              
              {/* Step 1: Enter or Select Amount */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                    Step 1: Enter or Select Amount
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Min Deposit: ₹{config?.minDeposit || 10}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400 font-['Space_Grotesk']">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    className="w-full pl-9 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-black text-lg focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setAmount(String(amt))}
                      className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all border ${
                        Number(amount) === amt
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/40 hover:text-white'
                      }`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: ONE-TAP DIRECT APP LAUNCHER */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-['Space_Grotesk']">
                    <span className="text-amber-400 font-black text-sm">⚡</span>
                    <span className="text-xs font-black uppercase text-slate-200 tracking-wider">
                      ONE-TAP DIRECT APP LAUNCHER:
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-400 font-['Space_Grotesk']">
                    Auto ₹{amount || '0'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('PhonePe', 'phonepe')}
                    className="p-3.5 rounded-2xl bg-[#1d1238]/80 hover:bg-[#28184e] border border-purple-500/30 flex flex-col items-center justify-center space-y-2 transition-all group hover:scale-[1.02] shadow-lg shadow-purple-950/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-600/30 p-1 flex items-center justify-center overflow-hidden border border-purple-400/40">
                      <img src="/images/phone%20pe.png" alt="PhonePe" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 font-['Space_Grotesk']">PhonePe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('GPay', 'gpay')}
                    className="p-3.5 rounded-2xl bg-[#0f2042]/80 hover:bg-[#152d5e] border border-blue-500/30 flex flex-col items-center justify-center space-y-2 transition-all group hover:scale-[1.02] shadow-lg shadow-blue-950/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-600/30 p-1 flex items-center justify-center overflow-hidden border border-blue-400/40">
                      <img src="/images/google%20pay.png" alt="GPay" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 font-['Space_Grotesk']">GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('Paytm', 'paytm')}
                    className="p-3.5 rounded-2xl bg-[#0c1c33]/80 hover:bg-[#122b4d] border border-sky-500/30 flex flex-col items-center justify-center space-y-2 transition-all group hover:scale-[1.02] shadow-lg shadow-sky-950/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-sky-600/30 p-1 flex items-center justify-center overflow-hidden border border-sky-400/40">
                      <img src="/images/paytm.jpeg" alt="Paytm" className="w-full h-full object-contain rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-sky-300 font-['Space_Grotesk']">Paytm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchUpiApp('BHIM', 'bhim')}
                    className="p-3.5 rounded-2xl bg-[#0a291e]/80 hover:bg-[#0f3d2d] border border-emerald-500/30 flex flex-col items-center justify-center space-y-2 transition-all group hover:scale-[1.02] shadow-lg shadow-emerald-950/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-600/30 p-1 flex items-center justify-center overflow-hidden border border-emerald-400/40">
                      <img src="/images/bhim.png" alt="BHIM" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 font-['Space_Grotesk']">BHIM</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('UPI App', 'generic')}
                  className="w-full py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Pay ₹{amount || '0'} via Any Installed UPI App 🚀</span>
                </button>
              </div>

              {/* Step 3: Web / Desktop Fallback */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">
                    Web / Desktop Fallback: Scan QR or Copy UPI
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-36 rounded-2xl bg-white p-2 border-2 border-emerald-500/40 shadow-xl flex items-center justify-center shrink-0">
                    {config?.qrCodeUrl ? (
                      <img src={config.qrCodeUrl} alt="Admin UPI QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-16 h-16 text-slate-800" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                    <p className="text-xs text-slate-400">Scan this QR code with any UPI app to pay ₹{amount || '0'}.</p>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {loadingConfig ? 'Syncing UPI ID...' : config?.upiId || 'No UPI ID Configured'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[11px] font-bold transition-colors flex items-center space-x-1"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Submit UTR & Payment Screenshot */}
              <form onSubmit={handleDepositSubmit} className="space-y-4 border-t border-slate-800 pt-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                    Step 3: Confirm Payment Details
                  </span>
                  <p className="text-[11px] text-slate-400">
                    After completing payment in your UPI app, enter your 12-Digit UTR number and attach payment screenshot.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">12-Digit Transaction Reference Number</label>
                  <input
                    type="text"
                    value={utr}
                    maxLength={12}
                    onChange={(e) => setUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))}
                    placeholder="e.g. 421890123456"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:border-emerald-500 outline-none uppercase"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Attach Payment Screenshot (Proof)</label>
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-950">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDepositImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {depositScreenshotPreview ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/40 shrink-0">
                          <img src={depositScreenshotPreview} alt="Screenshot preview" className="w-full h-full object-contain bg-black" />
                        </div>
                        <div className="text-left text-xs">
                          <p className="font-bold text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Payment Screenshot Selected</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Click to replace screenshot</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-emerald-400" />
                        <p className="text-xs font-bold text-slate-300">Upload Receipt / Screenshot</p>
                        <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, WEBP (Up to 8MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting Payment Proof...' : 'Submit Deposit Request 🚀'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: WITHDRAW REAL CASH (4-HOUR SLA) */}
          {activeTab === 'WITHDRAW' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>⚡ 4-Hour SLA Payout Guarantee: Admin processes bank transfer within 4 hours with payment proof!</span>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Min ₹100"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-base focus:border-emerald-500 outline-none"
                    required
                  />
                  <p className="text-[11px] text-slate-400">Available Wallet Balance: ₹{user?.walletBalance || 0}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Your UPI ID or Bank Details</label>
                  <input
                    type="text"
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or GPay number"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">4-Digit Security PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    placeholder="Enter 4-Digit Security PIN (e.g. 1234)"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Required if you set a Security PIN in your Profile settings</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Optional: Your Personal UPI QR Code</label>
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-950">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWithdrawQrChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {withdrawQrCode ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/40 shrink-0">
                          <img src={withdrawQrCode} alt="QR Code preview" className="w-full h-full object-contain bg-white p-1" />
                        </div>
                        <span className="text-xs font-bold text-emerald-400">QR Code Attached</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <QrCode className="w-6 h-6 mx-auto text-emerald-400" />
                        <p className="text-xs font-bold text-slate-300">Upload Your QR Code Image</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting Request...' : 'Submit Withdrawal Request 💸'}
                </button>
              </form>

            </div>
          )}

          {/* TAB 3: REQUESTS & SLA STATUS */}
          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white font-['Space_Grotesk']">Recent Requests & SLA Timers</h4>
                <button
                  onClick={loadAllHistories}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Withdrawals List with Live 4-Hour SLA Timer */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Withdrawals ({myWithdrawals.length})</span>
                {myWithdrawals.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold">No withdrawal requests found.</div>
                ) : (
                  myWithdrawals.map((w) => (
                    <div key={w._id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-base font-black text-emerald-400">₹{w.amount}</span>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">UPI: {w.upiId}</p>
                        </div>

                        <SlaCountdownTimer slaDeadline={w.slaDeadline} status={w.status} />
                      </div>

                      {w.adminPayoutScreenshotUrl && (
                        <button
                          onClick={() =>
                            setLightbox({
                              isOpen: true,
                              title: 'Admin Payout Proof Screenshot',
                              imageUrl: w.adminPayoutScreenshotUrl || '',
                              utr: w.adminPayoutUtr,
                              amount: w.amount,
                              note: w.adminNote,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold transition-colors flex items-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Admin Payout Screenshot Proof</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Deposits List */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Deposits ({myDeposits.length})</span>
                {myDeposits.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold">No deposit requests found.</div>
                ) : (
                  myDeposits.map((d) => (
                    <div key={d._id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-base font-black text-emerald-400">₹{d.amount}</span>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">UTR: {d.utr}</p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            d.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : d.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>

                      {d.paymentScreenshotUrl && (
                        <button
                          onClick={() =>
                            setLightbox({
                              isOpen: true,
                              title: 'Your Payment Screenshot Proof',
                              imageUrl: d.paymentScreenshotUrl || '',
                              utr: d.utr,
                              amount: d.amount,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Uploaded Payment Screenshot</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: IMMUTABLE AUDIT LOG */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white font-['Space_Grotesk']">Double-Entry Financial Audit Log</h4>

              {myTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-bold">No financial transactions recorded yet.</div>
              ) : (
                myTransactions.map((tx) => (
                  <div key={tx._id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white">{tx.description}</span>
                      <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-sm ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount >= 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold">Balance: ₹{tx.balanceAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>

      {/* Screenshot Lightbox Modal */}
      <ProofLightboxModal
        isOpen={lightbox.isOpen}
        title={lightbox.title}
        imageUrl={lightbox.imageUrl}
        utr={lightbox.utr}
        amount={lightbox.amount}
        note={lightbox.note}
        onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
