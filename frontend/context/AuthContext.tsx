'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User, GameMatchLog, GameStats, DepositRequest, AdminSettings } from '../types';
import { ToastContainer, ToastItem } from '../components/ToastContainer';

export type PlayMode = 'REAL' | 'DEMO';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  welcomeToast: string | null;
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  sendOTP: (email: string) => Promise<{ isExistingUser: boolean }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  signup: (name: string, email: string) => Promise<void>;
  logout: () => void;
  updateWalletBalance: (delta: number) => Promise<number>;
  updateDemoBalance: (delta: number) => number;
  updateName: (name: string) => Promise<void>;
  requestEmailChange: (newEmail: string) => Promise<boolean>;
  verifyEmailChange: (newEmail: string, otp: string) => Promise<void>;
  recordGameMatch: (
    gameSlug: string,
    gameTitle: string,
    result: 'WIN' | 'LOSS' | 'DRAW',
    amountSpent: number,
    amountWon: number,
    opponentName?: string
  ) => Promise<void>;
  fetchMatchHistory: (gameSlug?: string) => Promise<{ stats: GameStats; logs: GameMatchLog[] }>;
  openRazorpayCheckout: (amount: number) => void;

  // UTR & Deposit API
  submitDepositUTR: (amount: number, utr: string, paymentMethod?: string) => Promise<any>;
  submitWithdrawal: (amount: number, upiOrBankDetails: string) => Promise<any>;
  fetchMyDeposits: () => Promise<DepositRequest[]>;
  fetchPublicPaymentConfig: () => Promise<AdminSettings>;

  // Admin APIs
  adminLoginPasscode: (passcode: string) => Promise<boolean>;
  fetchAdminDeposits: (status?: string, search?: string) => Promise<DepositRequest[]>;
  adminApproveDeposit: (requestId: string, adminNote?: string) => Promise<any>;
  adminRejectDeposit: (requestId: string, reason?: string) => Promise<any>;
  updateAdminConfig: (configData: Partial<AdminSettings>) => Promise<AdminSettings>;
  fetchAdminStats: () => Promise<any>;
  fetchAdminUsers: () => Promise<User[]>;
  adminAdjustUserBalance: (userId: string, type: 'REAL' | 'DEMO', delta: number) => Promise<any>;
  adminCreateTestDeposit: (amount: number, email?: string) => Promise<any>;
  adminResetAllWallets: () => Promise<any>;
  fetchAdminGameLogs: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set Axios Base URL for Backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [playMode, setPlayModeState] = useState<PlayMode>('REAL');

  // Restore Session & Play Mode on Mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user_session');
    const storedMode = localStorage.getItem('baazi_play_mode') as PlayMode;

    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.demoBalance === undefined || parsed.demoBalance === 10000) {
          parsed.demoBalance = 1000;
          localStorage.setItem('user_session', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (e) {
        // ignore
      }
    }

    if (storedMode === 'DEMO' || storedMode === 'REAL') {
      setPlayModeState(storedMode);
    }
  }, []);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastItem = { id, message, type };
    setToasts((prev) => [...prev.slice(-4), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setPlayMode = (mode: PlayMode) => {
    setPlayModeState(mode);
    localStorage.setItem('baazi_play_mode', mode);
    showToast(`Switched to ${mode === 'REAL' ? '💰 Real Money Play' : '🎮 Demo Play Mode (Free Coins)'}`, 'info');
  };

  // Sync session with backend me endpoint
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await axios.get('/api/auth/me');
        if (res.data.success) {
          const freshUser = res.data.user;
          if (freshUser.demoBalance === undefined) freshUser.demoBalance = 1000;
          setUser(freshUser);
          localStorage.setItem('user_session', JSON.stringify(freshUser));
        }
      } catch (error) {
        // Keeps user logged in using cached session
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Send 4-Digit OTP to Email (Direct Login for existing registered users)
  const sendOTP = async (email: string): Promise<{ isExistingUser: boolean }> => {
    try {
      const res = await axios.post('/api/auth/send-otp', { email });

      // EXISTING REGISTERED USER -> DIRECT LOGIN IMMEDIATELY ACCEPTED
      if (res.data.isExistingUser) {
        const newToken = res.data.token;
        const newUser = res.data.user;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        setToken(newToken);
        setUser(newUser);
        closeAuthModal();

        showToast(`Welcome back, ${newUser.name}! Login successful 🎉`, 'success');
        if (res.data.claimedBonusNow) {
          setTimeout(() => {
            showToast(`🎉 Welcome Bonus! 1,000 Demo Coins credited to your account!`, 'success');
          }, 500);
        }

        return { isExistingUser: true };
      }

      // FIRST TIME USER -> OTP SENT TO EMAIL
      showToast(`4-Digit OTP sent to ${email}. Check console/dev mode (1234)`, 'info');
      return { isExistingUser: false };
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to process email login', 'error');
      throw new Error(err.response?.data?.message || 'Failed to process email login');
    }
  };

  // Verify 4-Digit OTP & Login
  const verifyOTP = async (email: string, otp: string) => {
    try {
      const res = await axios.post('/api/auth/verify-otp', { email, otp });
      if (res.data.success) {
        const newToken = res.data.token;
        const newUser = res.data.user;
        if (newUser.demoBalance === undefined) newUser.demoBalance = 1000;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        setToken(newToken);
        setUser(newUser);
        closeAuthModal();

        showToast(`Welcome to Baazi Board Arena, ${newUser.name}! 🎉`, 'success');
        if (res.data.claimedBonusNow) {
          setTimeout(() => {
            showToast(`🎉 First Time Reward! 1,000 Demo Coins credited to your wallet!`, 'success');
          }, 500);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid 4-digit OTP. Use 1234 in preview mode!', 'error');
      throw new Error(err.response?.data?.message || 'Invalid 4-digit OTP. Please try again!');
    }
  };

  const login = async (email: string) => {
    await sendOTP(email);
  };

  const signup = async (_name: string, email: string) => {
    await sendOTP(email);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_session');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  const updateWalletBalance = async (delta: number): Promise<number> => {
    if (!user) return 0;
    const newBal = Math.max(0, (user.walletBalance || 0) + delta);
    const updated = { ...user, walletBalance: newBal };
    setUser(updated);
    localStorage.setItem('user_session', JSON.stringify(updated));

    if (delta < 0) showToast(`₹${Math.abs(delta)} Real Cash deducted`, 'info');
    else if (delta > 0) showToast(`₹${delta} Real Cash added!`, 'success');

    if (token) {
      try {
        await axios.post('/api/auth/update-coins', { delta });
      } catch (err) {
        // Handled silently
      }
    }
    return newBal;
  };

  const updateDemoBalance = (delta: number): number => {
    if (!user) return 1000;
    const currentDemo = user.demoBalance !== undefined ? user.demoBalance : 1000;
    const newDemo = Math.max(0, currentDemo + delta);
    const updated = { ...user, demoBalance: newDemo };
    setUser(updated);
    localStorage.setItem('user_session', JSON.stringify(updated));

    if (delta < 0) showToast(`🪙 ${Math.abs(delta)} Demo Coins deducted`, 'info');
    else if (delta > 0) showToast(`🪙 ${delta} Demo Coins added!`, 'success');

    return newDemo;
  };

  const updateName = async (newName: string) => {
    if (!user) return;
    try {
      const res = await axios.post('/api/auth/update-name', { name: newName });
      if (res.data.success) {
        const updated = { ...user, name: newName };
        setUser(updated);
        localStorage.setItem('user_session', JSON.stringify(updated));
        setWelcomeToast(`Display name updated to ${newName}! ✨`);
        setTimeout(() => setWelcomeToast(null), 3000);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update display name');
    }
  };

  const requestEmailChange = async (newEmail: string): Promise<boolean> => {
    try {
      const res = await axios.post('/api/auth/request-email-change', { newEmail });
      return res.data.success;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to send OTP to new email');
    }
  };

  const verifyEmailChange = async (newEmail: string, otp: string) => {
    try {
      const res = await axios.post('/api/auth/verify-email-change', { newEmail, otp });
      if (res.data.success) {
        const newToken = res.data.token;
        const newUser = res.data.user;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        setToken(newToken);
        setUser(newUser);
        setWelcomeToast(`Email updated to ${newEmail}! ✉️`);
        setTimeout(() => setWelcomeToast(null), 3000);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Invalid email verification OTP');
    }
  };

  const recordGameMatch = async (
    gameSlug: string,
    gameTitle: string,
    result: 'WIN' | 'LOSS' | 'DRAW',
    amountSpent: number = 10,
    amountWon: number = 0,
    opponentName: string = 'Online Player'
  ) => {
    if (!user) return;
    const fee = amountSpent || 10;

    try {
      const res = await axios.post('/api/games/settle-match', {
        gameSlug,
        gameTitle,
        playMode,
        result,
        entryFee: fee,
        opponentName,
      });

      if (res.data.success && res.data.user) {
        const updated = {
          ...user,
          walletBalance: res.data.user.walletBalance,
          demoBalance: res.data.user.demoBalance,
        };
        setUser(updated);
        localStorage.setItem('user_session', JSON.stringify(updated));

        if (playMode === 'REAL') {
          if (result === 'WIN') {
            const winPayout = Math.round(fee * 1.8);
            const netProf = Math.round(fee * 0.8);
            setWelcomeToast(`🎉 VICTORY! Won ₹${winPayout}! (+₹${netProf} Profit)`);
          } else if (result === 'LOSS') {
            setWelcomeToast(`💔 Defeated! (-₹${fee})`);
          } else {
            setWelcomeToast(`🤝 Draw Game! Entry fee ₹${fee} refunded to wallet.`);
          }
          setTimeout(() => setWelcomeToast(null), 4000);
        } else {
          if (result === 'WIN') {
            setWelcomeToast(`🎉 VICTORY! Won ${Math.round(fee * 1.8)} Demo Coins!`);
          } else if (result === 'LOSS') {
            setWelcomeToast(`💔 Match Over! (-${fee} Demo Coins)`);
          }
          setTimeout(() => setWelcomeToast(null), 3000);
        }
      }
    } catch (err) {
      console.error('Settlement error:', err);
    }
  };

  const fetchMatchHistory = async (gameSlug?: string): Promise<{ stats: GameStats; logs: GameMatchLog[] }> => {
    if (token) {
      try {
        const url = gameSlug ? `/api/games/history?gameSlug=${gameSlug}` : '/api/games/history';
        const res = await axios.get(url);
        if (res.data.success) {
          return { stats: res.data.stats, logs: res.data.logs };
        }
      } catch (err) {
        // Fallback
      }
    }

    const localLogs: GameMatchLog[] = JSON.parse(localStorage.getItem('user_match_logs') || '[]');
    const filtered = gameSlug ? localLogs.filter((l) => l.gameSlug === gameSlug) : localLogs;
    const wins = filtered.filter((l) => l.result === 'WIN').length;
    const losses = filtered.filter((l) => l.result === 'LOSS').length;
    const draws = filtered.filter((l) => l.result === 'DRAW').length;
    const totalWon = filtered.reduce((sum, l) => sum + (l.amountWon || 0), 0);
    const totalSpent = filtered.reduce((sum, l) => sum + (l.amountSpent || 0), 0);

    return {
      stats: {
        totalMatches: filtered.length,
        wins,
        losses,
        draws,
        winRate: filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0,
        totalWon,
        totalSpent,
        netEarnings: totalWon - totalSpent,
      },
      logs: filtered,
    };
  };

  const openRazorpayCheckout = async (amount: number) => {
    if (!user) {
      openAuthModal();
      return;
    }
    await updateWalletBalance(amount);
    setWelcomeToast(`Successfully added ₹${amount} to your wallet balance! 💰`);
    setTimeout(() => setWelcomeToast(null), 3500);
  };

  // UTR Deposit & Payment APIs
  const submitDepositUTR = async (amount: number, utr: string, paymentMethod: string = 'UPI_QR') => {
    try {
      const res = await axios.post('/api/payment/deposit', { amount, utr, paymentMethod });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to submit deposit UTR');
    }
  };

  const submitWithdrawal = async (amount: number, upiOrBankDetails: string) => {
    try {
      const res = await axios.post('/api/payment/withdraw', { amount, upiOrBankDetails });
      if (res.data.success && user) {
        const updated = { ...user, walletBalance: res.data.newWalletBalance };
        setUser(updated);
        localStorage.setItem('user_session', JSON.stringify(updated));
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to submit withdrawal request');
    }
  };

  const fetchMyDeposits = async (): Promise<DepositRequest[]> => {
    try {
      const res = await axios.get('/api/payment/my-deposits');
      if (res.data.success) {
        return res.data.requests;
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const fetchPublicPaymentConfig = async (): Promise<AdminSettings> => {
    try {
      const res = await axios.get('/api/payment/config');
      if (res.data.success) {
        return res.data.config;
      }
      return {
        qrCodeUrl: '/images/payment_qr.jpg',
        upiId: 'baaziboard@paytm',
        upiHolderName: 'Baazi Board Official',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
        minDeposit: 100,
        minWithdrawal: 200,
      };
    } catch (err) {
      return {
        qrCodeUrl: '/images/payment_qr.jpg',
        upiId: 'baaziboard@paytm',
        upiHolderName: 'Baazi Board Official',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
        minDeposit: 100,
        minWithdrawal: 200,
      };
    }
  };

  // Admin Portal Actions
  const adminLoginPasscode = async (passcode: string): Promise<boolean> => {
    try {
      const res = await axios.post('/api/admin/login', { passcode });
      if (res.data.success) {
        localStorage.setItem('admin_passcode_token', res.data.token);
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Invalid Admin Passcode');
    }
  };

  const fetchAdminDeposits = async (status?: string, search?: string): Promise<DepositRequest[]> => {
    try {
      let url = '/api/admin/deposits?';
      if (status) url += `status=${encodeURIComponent(status)}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;
      const res = await axios.get(url);
      if (res.data.success) {
        return res.data.requests;
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const adminApproveDeposit = async (requestId: string, adminNote?: string) => {
    try {
      const res = await axios.post('/api/admin/deposits/approve', { requestId, adminNote });
      // If the currently logged in user is the beneficiary, update their balance live
      if (res.data.success && user && res.data.depositRequest?.userId === user.id) {
        const updated = { ...user, walletBalance: res.data.updatedUserBalance };
        setUser(updated);
        localStorage.setItem('user_session', JSON.stringify(updated));
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const adminRejectDeposit = async (requestId: string, reason?: string) => {
    try {
      const res = await axios.post('/api/admin/deposits/reject', { requestId, reason });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const updateAdminConfig = async (configData: Partial<AdminSettings>): Promise<AdminSettings> => {
    try {
      const res = await axios.post('/api/admin/config', configData);
      if (res.data.success) {
        return res.data.settings;
      }
      throw new Error('Failed to update config');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update admin config');
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      if (res.data.success) {
        return res.data.stats;
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const fetchAdminUsers = async (): Promise<User[]> => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        return res.data.users;
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const adminAdjustUserBalance = async (userId: string, type: 'REAL' | 'DEMO', delta: number) => {
    try {
      const res = await axios.post('/api/admin/users/adjust-balance', { userId, type, delta });
      if (res.data.success && user && res.data.user?.id === user.id) {
        const updated = {
          ...user,
          walletBalance: res.data.user.walletBalance,
          demoBalance: res.data.user.demoBalance,
        };
        setUser(updated);
        localStorage.setItem('user_session', JSON.stringify(updated));
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to adjust user balance');
    }
  };

  const adminCreateTestDeposit = async (amount: number, email?: string) => {
    try {
      const res = await axios.post('/api/admin/deposits/create-test', { amount, email });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create test deposit');
    }
  };

  const adminResetAllWallets = async () => {
    try {
      const res = await axios.post('/api/admin/users/reset-all-wallets');
      if (user) {
        setUser({ ...user, walletBalance: 0 });
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to reset user wallets');
    }
  };

  const fetchAdminGameLogs = async () => {
    try {
      const res = await axios.get('/api/admin/game-logs');
      if (res.data.success) {
        return res.data;
      }
      return { totalAdminCommission: 0, logs: [] };
    } catch (err) {
      return { totalAdminCommission: 0, logs: [] };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthModalOpen,
        welcomeToast,
        playMode,
        setPlayMode,
        showToast,
        openAuthModal,
        closeAuthModal,
        sendOTP,
        verifyOTP,
        login,
        signup,
        logout,
        updateWalletBalance,
        updateDemoBalance,
        updateName,
        requestEmailChange,
        verifyEmailChange,
        recordGameMatch,
        fetchMatchHistory,
        openRazorpayCheckout,
        submitDepositUTR,
        submitWithdrawal,
        fetchMyDeposits,
        fetchPublicPaymentConfig,
        adminLoginPasscode,
        fetchAdminDeposits,
        adminApproveDeposit,
        adminRejectDeposit,
        updateAdminConfig,
        fetchAdminStats,
        fetchAdminUsers,
        adminAdjustUserBalance,
        adminCreateTestDeposit,
        adminResetAllWallets,
        fetchAdminGameLogs,
      }}
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
