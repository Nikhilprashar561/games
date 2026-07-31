'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface SlaCountdownTimerProps {
  slaDeadline: string;
  status: string;
}

export const SlaCountdownTimer: React.FC<SlaCountdownTimerProps> = ({ slaDeadline, status }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isBreached: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isBreached: false,
  });

  useEffect(() => {
    if (status !== 'PENDING') return;

    const deadlineMs = new Date(slaDeadline).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffMs = deadlineMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isBreached: true });
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isBreached: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [slaDeadline, status]);

  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Paid & Completed</span>
      </span>
    );
  }

  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
        <span>Rejected & Refunded</span>
      </span>
    );
  }

  if (timeLeft.isBreached) {
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold animate-pulse shadow-md">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>SLA BREACHED! (Over 4 Hours)</span>
      </span>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
        isUrgent
          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        4H SLA: {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </span>
  );
};
