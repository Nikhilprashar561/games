'use client';

import React from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';

interface GameConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const GameConfirmModal: React.FC<GameConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes, Proceed',
  cancelText = 'No, Keep Playing',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0f1d] text-white overflow-hidden">
        
        {/* Ambient Glow */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
          variant === 'danger' ? 'bg-rose-500/20' : 'bg-amber-500/20'
        }`}></div>

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="text-center mb-5">
          <div className={`inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl shadow-lg ${
            variant === 'danger'
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-500/20'
              : 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-500/20'
          }`}>
            {variant === 'danger' ? (
              <LogOut className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed font-semibold">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs sm:text-sm border border-slate-700 transition-all text-center"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-lg transition-all text-center ${
              variant === 'danger'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25'
                : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-500/25'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};
