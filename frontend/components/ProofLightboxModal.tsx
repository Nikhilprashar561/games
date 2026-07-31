'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';

interface ProofLightboxModalProps {
  isOpen: boolean;
  title: string;
  imageUrl: string;
  utr?: string;
  amount?: number;
  note?: string;
  onClose: () => void;
}

export const ProofLightboxModal: React.FC<ProofLightboxModalProps> = ({
  isOpen,
  title,
  imageUrl,
  utr,
  amount,
  note,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-['Space_Grotesk'] text-white text-base">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Screenshot Image Container with Crop/Focus View */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Payment Screenshot Proof"
              className="w-full h-full object-contain p-2 rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="text-center p-6 text-slate-500 text-sm font-semibold">
              No screenshot proof attached.
            </div>
          )}
        </div>

        {/* Info Badges */}
        <div className="grid grid-cols-2 gap-3 text-xs font-bold font-['Space_Grotesk']">
          {amount !== undefined && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase">Amount</span>
              <span className="text-emerald-400 text-base font-extrabold">₹{amount}</span>
            </div>
          )}
          {utr && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase">Bank UTR / Ref</span>
              <span className="text-amber-400 text-xs font-mono font-bold truncate">{utr}</span>
            </div>
          )}
        </div>

        {note && (
          <p className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-300">Note: </span>
            {note}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
        >
          Close Lightbox
        </button>

      </div>
    </div>
  );
};
