'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Wallet, ShieldCheck, ArrowRight } from 'lucide-react';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose }) => {
  const { openRazorpayCheckout } = useAuth();
  const [customAmount, setCustomAmount] = useState<string>('200');
  const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000];

  if (!isOpen) return null;

  const handleProceed = (amt: number) => {
    onClose();
    openRazorpayCheckout(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden bg-[#0a0f1d] text-white">
        
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/30 text-white">
            <Wallet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight font-['Space_Grotesk']">
            Add Money to Wallet
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Instant Wallet Balance Top-Up
          </p>
        </div>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleProceed(amt)}
              className="py-3 px-3 rounded-2xl font-extrabold text-sm border-2 bg-slate-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 text-white transition-all shadow-sm flex items-center justify-center"
            >
              + ₹{amt}
            </button>
          ))}
        </div>

        {/* Custom Amount Form */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Or Enter Custom Amount (₹)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="10"
              max="10000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-extrabold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => handleProceed(Number(customAmount) || 100)}
              className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center space-x-1"
            >
              <span>Add</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] font-bold text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% Secure & Instant Wallet Credit</span>
        </div>

      </div>
    </div>
  );
};
