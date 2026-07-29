'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Gamepad2, Sparkles, Mail, AlertCircle, ArrowRight, ShieldCheck, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, sendOTP, verifyOTP } = useAuth();
  
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  const digitInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Resend Timer Countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  if (!isAuthModalOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your email address');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid real email address (e.g. user@gmail.com)');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await sendOTP(cleanEmail);

      // If existing user, direct login happened in AuthContext! Clear form.
      if (res && res.isExistingUser) {
        setEmail('');
        setOtpDigits(['', '', '', '']);
        setStep('email');
        return;
      }

      // First time user -> Proceed to OTP verification step!
      setStep('otp');
      setResendTimer(30);
      setSuccessMsg(`First-time registration: 4-Digit OTP sent to ${cleanEmail}. Check your inbox!`);
      setTimeout(() => {
        digitInputRefs[0].current?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process email login. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (errorMsg) setErrorMsg(null);

    // Auto-focus next input box
    if (value && index < 3) {
      digitInputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{4}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      digitInputRefs[3].current?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');

    if (otpCode.length < 4) {
      setErrorMsg('Please enter all 4 digits of your verification OTP');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await verifyOTP(email, otpCode);
      setEmail('');
      setOtpDigits(['', '', '', '']);
      setStep('email');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid 4-digit OTP. Please check your email and try again!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await sendOTP(email);
      setResendTimer(30);
      setSuccessMsg(`New 4-Digit OTP sent to ${email}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-8 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-[#0a0f1d] text-white">
        
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-full hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/30">
            {step === 'email' ? <Gamepad2 className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight font-['Space_Grotesk']">
            {step === 'email' ? 'Email OTP Authentication' : 'Verify 4-Digit OTP'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            {step === 'email'
              ? 'Enter your real email to receive a 4-digit verification code'
              : `Enter the 4-digit code sent to ${email}`}
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: EMAIL ENTRY FORM */}
        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Real Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g., nikhil@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-semibold"
                />
              </div>
              <p className="text-[11px] text-emerald-400 mt-2 font-semibold leading-normal">
                💡 Note: Registered users log in instantly with no OTP! First-time users will receive a 4-digit verification OTP email.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <span>{submitting ? 'Sending 4-Digit OTP...' : 'Send 4-Digit OTP 📩'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2: 4-DIGIT OTP VERIFICATION FORM */
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-center mb-3">
                Enter 4-Digit Verification Code
              </label>
              <div className="flex justify-center items-center space-x-3" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={digitInputRefs[idx]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-14 h-16 text-center text-2xl font-black bg-slate-800 border-2 border-slate-700 rounded-2xl text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otpDigits.join('').length < 4}
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <span>{submitting ? 'Verifying OTP...' : 'Verify & Enter Arena 🚀'}</span>
              <ShieldCheck className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="hover:text-emerald-400 transition-colors"
              >
                ← Change Email
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || submitting}
                onClick={handleResendOTP}
                className={`flex items-center space-x-1 ${
                  resendTimer > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-[11px] font-bold text-slate-500 flex items-center justify-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Instant OTP Auth &bull; 100% Secure Gaming</span>
        </div>

      </div>
    </div>
  );
};
