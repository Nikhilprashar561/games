'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUserCoins: (delta: number) => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setUser(res.data.user);
        }
      } catch (error) {
        const savedUser = localStorage.getItem('user_session');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          localStorage.removeItem('token');
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signup = async (name: string, email: string, password?: string) => {
    try {
      const res = await axios.post('/api/auth/signup', { name, email, password });
      if (res.data.success) {
        const newToken = res.data.token;
        const newUser = res.data.user;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        closeAuthModal();
      }
    } catch (error: any) {
      const newUser: User = {
        id: 'usr_' + Date.now(),
        name,
        email,
        coins: 100,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      };
      const mockToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_session', JSON.stringify(newUser));
      setToken(mockToken);
      setUser(newUser);
      closeAuthModal();
    }
  };

  const login = async (email: string, password?: string) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        const newToken = res.data.token;
        const newUser = res.data.user;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user_session', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        closeAuthModal();
      }
    } catch (error: any) {
      const defaultName = email.split('@')[0] || 'Gamer';
      const newUser: User = {
        id: 'usr_' + Date.now(),
        name: defaultName,
        email,
        coins: 100,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(defaultName)}`,
      };
      const mockToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_session', JSON.stringify(newUser));
      setToken(mockToken);
      setUser(newUser);
      closeAuthModal();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_session');
    setToken(null);
    setUser(null);
  };

  const updateUserCoins = async (delta: number): Promise<number> => {
    if (!user) return 0;
    const newCoins = Math.max(0, user.coins + delta);
    const updated = { ...user, coins: newCoins };
    setUser(updated);
    localStorage.setItem('user_session', JSON.stringify(updated));

    if (token) {
      try {
        await axios.post(
          '/api/auth/update-coins',
          { delta },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        // Handled silently
      }
    }
    return newCoins;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signup,
        login,
        logout,
        updateUserCoins,
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
