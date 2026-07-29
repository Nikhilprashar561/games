'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User, GameMatchLog, GameStats } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  welcomeToast: string | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  sendOTP: (email: string) => Promise<{ isExistingUser: boolean }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  signup: (name: string, email: string) => Promise<void>;
  logout: () => void;
  updateWalletBalance: (delta: number) => Promise<number>;
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

  // Restore Session on Mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user_session');

    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // ignore
      }
    }
  }, []);

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
          setUser(res.data.user);
          localStorage.setItem('user_session', JSON.stringify(res.data.user));
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

        setWelcomeToast(`Welcome back, ${newUser.name}! Direct login successful. 🎉`);
        setTimeout(() => setWelcomeToast(null), 3000);

        return { isExistingUser: true };
      }

      // FIRST TIME USER -> OTP SENT TO EMAIL
      return { isExistingUser: false };
    } catch (err: any) {
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

        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        setToken(newToken);
        setUser(newUser);
        closeAuthModal();

        setWelcomeToast(`Welcome to Baazi Board Arena, ${newUser.name}! 🎉`);
        setTimeout(() => setWelcomeToast(null), 3000);
      }
    } catch (err: any) {
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
  };

  const updateWalletBalance = async (delta: number): Promise<number> => {
    if (!user) return 0;
    const newBal = Math.max(0, (user.walletBalance || 0) + delta);
    const updated = { ...user, walletBalance: newBal };
    setUser(updated);
    localStorage.setItem('user_session', JSON.stringify(updated));

    if (token) {
      try {
        await axios.post('/api/auth/update-coins', { delta });
      } catch (err) {
        // Handled silently
      }
    }
    return newBal;
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
    amountSpent: number,
    amountWon: number,
    opponentName: string = 'Online Player'
  ) => {
    if (!user) return;
    const logData = {
      gameSlug,
      gameTitle,
      result,
      amountSpent,
      amountWon,
      opponentName,
    };

    if (token) {
      try {
        await axios.post('/api/games/log', logData);
      } catch (err) {
        const logs = JSON.parse(localStorage.getItem('user_match_logs') || '[]');
        logs.unshift({
          id: 'log_' + Date.now(),
          userId: user.id,
          userEmail: user.email,
          gameSlug,
          gameTitle,
          result,
          amountSpent,
          amountWon,
          netAmount: amountWon - amountSpent,
          opponentName,
          playedAt: new Date().toISOString(),
        });
        localStorage.setItem('user_match_logs', JSON.stringify(logs));
      }
    } else {
      const logs = JSON.parse(localStorage.getItem('user_match_logs') || '[]');
      logs.unshift({
        id: 'log_' + Date.now(),
        userId: user.id,
        userEmail: user.email,
        gameSlug,
        gameTitle,
        result,
        amountSpent,
        amountWon,
        netAmount: amountWon - amountSpent,
        opponentName,
        playedAt: new Date().toISOString(),
      });
      localStorage.setItem('user_match_logs', JSON.stringify(logs));
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

  // Instant Wallet Money Top Up (Razorpay Removed)
  const openRazorpayCheckout = async (amount: number) => {
    if (!user) {
      openAuthModal();
      return;
    }

    await updateWalletBalance(amount);
    setWelcomeToast(`Successfully added ₹${amount} to your wallet balance! 💰`);
    setTimeout(() => setWelcomeToast(null), 3500);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthModalOpen,
        welcomeToast,
        openAuthModal,
        closeAuthModal,
        sendOTP,
        verifyOTP,
        login,
        signup,
        logout,
        updateWalletBalance,
        updateName,
        requestEmailChange,
        verifyEmailChange,
        recordGameMatch,
        fetchMatchHistory,
        openRazorpayCheckout,
      }}
    >
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
