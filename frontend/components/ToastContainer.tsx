'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  const visibleToasts = toasts.slice(-3);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col space-y-2.5 max-w-xs sm:max-w-sm w-full pointer-events-none px-3">
      {visibleToasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl flex items-start justify-between space-x-3 text-xs font-bold transition-all duration-300 animate-slide-up ${
              isSuccess
                ? 'bg-[#0a0f1d]/95 border-emerald-500/50 text-emerald-400 shadow-emerald-500/15'
                : isError
                ? 'bg-[#0a0f1d]/95 border-rose-500/50 text-rose-400 shadow-rose-500/15'
                : isWarning
                ? 'bg-[#0a0f1d]/95 border-amber-500/50 text-amber-300 shadow-amber-500/15'
                : 'bg-[#0a0f1d]/95 border-blue-500/50 text-blue-300 shadow-blue-500/15'
            }`}
          >
            <div className="flex items-start space-x-2.5 min-w-0">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              {isInfo && <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />}
              <span className="leading-snug text-white font-extrabold break-words">{toast.message}</span>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
