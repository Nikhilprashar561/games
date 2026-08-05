'use client';

import React from 'react';
import { AlertTriangle, LogOut, X, Info } from 'lucide-react';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-7 glass-panel rounded-3xl border border-slate-800 shadow-2xl bg-[#0a0f1d] text-white flex flex-col justify-between">
        
        {/* Ambient Backlight */}
        <div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
            variant === 'danger'
              ? 'bg-rose-500/20'
              : variant === 'warning'
              ? 'bg-amber-500/20'
              : 'bg-emerald-500/20'
          }`}
        ></div>

        {/* Top Close Icon Button */}
        <button
          onClick={onCancel}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header & Message */}
        <div className="text-center my-2 sm:my-3">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 mb-3 rounded-2xl shadow-lg shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-500/10'
                : variant === 'warning'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
            }`}
          >
            {variant === 'danger' ? (
              <LogOut className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : variant === 'warning' ? (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <Info className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white font-['Space_Grotesk'] tracking-tight">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-semibold max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Responsive Action Buttons (Stacked on Mobile, Row on Tablet/Desktop) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-slate-800/60 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-extrabold text-xs sm:text-sm border border-slate-700 transition-all text-center"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm text-white shadow-lg transition-all text-center ${
              variant === 'danger'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25'
                : variant === 'warning'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-500/25'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};
