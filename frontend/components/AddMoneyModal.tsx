'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, AdminSettings } from '../types';
import { X, QrCode, Copy, Check, Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Wallet, Download } from 'lucide-react';

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
    const cleanUtr = utr.trim();

    if (!numAmount || numAmount < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid deposit amount (min ₹10)' });
      return;
    }

    if (!cleanUtr || cleanUtr.length < 6) {
      setFeedback({ type: 'error', message: 'Please enter a valid 12-digit UTR / Reference ID from your payment app' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDepositUTR(numAmount, cleanUtr, 'UPI_QR');
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Deposit request of ₹${numAmount} submitted! (UTR: ${cleanUtr}). Verification pending by Admin.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg p-4 sm:p-6 lg:p-8 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh] bg-[#0a0f1d] text-white my-auto">
        
        {/* Glow Background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center space-x-3 mb-5 pr-8">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-md text-white flex-shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight font-['Space_Grotesk'] truncate">
              Baazi Board Cash Wallet
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 font-semibold truncate">
              Real Wallet Balance: <span className="text-emerald-400 font-bold">₹{user?.walletBalance || 0}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-900/90 p-1 sm:p-1.5 rounded-2xl border border-slate-800 mb-5 gap-1 text-[11px] sm:text-xs">
          <button
            onClick={() => { setActiveTab('DEPOSIT'); setFeedback(null); }}
            className={`flex-1 py-2 sm:py-2.5 px-1 rounded-xl font-extrabold transition-all text-center ${
              activeTab === 'DEPOSIT' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">📲 Deposit via QR / UPI</span>
            <span className="sm:hidden">📲 Deposit</span>
          </button>
          <button
            onClick={() => { setActiveTab('STATUS'); setFeedback(null); loadHistory(); }}
            className={`flex-1 py-2 sm:py-2.5 px-1 rounded-xl font-extrabold transition-all text-center ${
              activeTab === 'STATUS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">📋 UTR Status ({myDeposits.length})</span>
            <span className="sm:hidden">📋 Status ({myDeposits.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('WITHDRAW'); setFeedback(null); }}
            className={`flex-1 py-2 sm:py-2.5 px-1 rounded-xl font-extrabold transition-all text-center ${
              activeTab === 'WITHDRAW' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">💸 Withdraw Real Cash</span>
            <span className="sm:hidden">💸 Withdraw</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-2xl border text-xs font-bold flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: DEPOSIT VIA QR & UPI */}
        {activeTab === 'DEPOSIT' && (
          <form onSubmit={handleDepositSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            
            {/* Step 1: Scan & Pay Details Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Scan QR Code or Copy UPI ID</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Instant Payment
                </span>
              </div>

              {/* QR Image + UPI Copy Side-by-Side */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {/* QR Code Container */}
                {config?.isQrEnabled !== false && (
                  <div className="w-32 h-32 rounded-xl bg-white p-1.5 shadow-md flex-shrink-0 flex items-center justify-center">
                    <img
                      src={config?.qrCodeUrl || '/images/payment_qr.svg'}
                      alt="Baazi Board Payment QR"
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        // fallback dummy QR
                        (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          config?.upiId || 'baaziboard@paytm'
                        )}`;
                      }}
                    />
                  </div>
                )}

                {/* UPI & Bank Details Box */}
                <div className="flex-1 w-full space-y-2 text-xs">
                  {config?.isQrEnabled !== false && (
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Official UPI ID:</span>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 mt-1">
                        <span className="font-extrabold text-emerald-400 truncate">{config?.upiId || 'baaziboard@paytm'}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="ml-2 p-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex items-center space-x-1"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {config?.isBankEnabled && config?.accountNumber && (
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block">Bank Account Details:</span>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 mt-1">
                        <div className="text-[11px] font-semibold text-slate-300 truncate">
                          <span>{config?.bankName}</span> &bull; <span>A/C: {config?.accountNumber}</span> {config?.ifscCode && `(${config.ifscCode})`}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyBank}
                          className="ml-2 p-1 text-slate-400 hover:text-white"
                          title="Copy Bank Details"
                        >
                          {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Amount Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Deposit Amount (₹)
              </label>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
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
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Step 3: UTR / Reference Number Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Enter 12-Digit UTR / Transaction Reference ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 420918239012 (found in Paytm/PhonePe receipt)"
                value={utr}
                onChange={(e) => setUtr(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-wider placeholder:font-sans placeholder:text-slate-500"
              />
              <p className="text-[11px] text-amber-400 mt-1.5 font-semibold leading-normal">
                💡 Note: After paying via Paytm/PhonePe/GPay, enter the 12-digit UTR/Ref number above. Admin verifies the UTR and credits ₹{amount || 0} directly to your wallet!
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !utr.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting UTR...' : 'Submit UTR for Verification 🚀'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>
        )}

        {/* TAB 2: UTR STATUS & HISTORY */}
        {activeTab === 'STATUS' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase">My Submitted Deposits & Withdrawals</span>
              <button
                onClick={loadHistory}
                className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 mt-2 font-semibold">Loading UTR history...</p>
              </div>
            ) : myDeposits.length === 0 ? (
              <div className="py-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">No UTR requests submitted yet</p>
                <p className="text-xs text-slate-500 mt-1">Make a deposit via QR code to see live verification status here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeposits.map((req) => (
                  <div
                    key={req._id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-white">
                          {req.type === 'DEPOSIT' ? '➕ Deposit' : '➖ Withdrawal'} ₹{req.amount}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {req.utr}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold block mt-1">
                        Submitted: {new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {req.rejectionReason && (
                        <span className="text-[11px] text-rose-400 font-semibold block mt-0.5">
                          Note: {req.rejectionReason}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Admin</span>
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved & Credited</span>
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

        {/* TAB 3: WITHDRAW CASH */}
        {activeTab === 'WITHDRAW' && (
          <form onSubmit={handleWithdrawSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 block uppercase">Available Real Balance</span>
              <span className="text-2xl font-black text-emerald-400 font-['Space_Grotesk']">
                ₹{user?.walletBalance || 0}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                max={user?.walletBalance || 100000}
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter Withdrawal Amount (min ₹100)"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-extrabold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Your UPI ID or Bank Details (A/C & IFSC)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. user@paytm or HDFC A/C 50100..."
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || (user?.walletBalance || 0) < 100}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting Request...' : 'Submit Cash Withdrawal 💸'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] font-bold text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% Safe Manual UTR Verification & Real Cash Payouts</span>
        </div>

      </div>
    </div>
  );
};
