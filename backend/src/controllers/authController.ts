import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory fallback user store when MongoDB is offline
const fallbackUsers: Map<string, any> = new Map();

const generateToken = (id: string, email: string) => {
  return jwt.sign(
    { id, email },
    process.env.JWT_SECRET || 'super_secret_game_jwt_key_2026_antigravity',
    { expiresIn: '30d' }
  );
};

// @desc    Email-Only Login / Register Endpoint
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address (e.g., user@example.com)' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const displayName = name || cleanEmail.split('@')[0];

    try {
      let user = await User.findOne({ email: cleanEmail });
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        user = await User.create({
          name: displayName,
          email: cleanEmail,
          walletBalance: 500, // Starting ₹500 money balance
          upiId: `${cleanEmail.split('@')[0]}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
        });
      }

      const token = generateToken(user._id.toString(), user.email);

      return res.json({
        success: true,
        isNewUser,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance,
          upiId: user.upiId,
          avatar: user.avatar,
        },
      });
    } catch (dbErr) {
      let isNewUser = false;
      let mockUser = fallbackUsers.get(cleanEmail);
      if (!mockUser) {
        isNewUser = true;
        mockUser = {
          id: 'user_' + Date.now(),
          name: displayName,
          email: cleanEmail,
          walletBalance: 500,
          upiId: `${cleanEmail.split('@')[0]}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
        };
        fallbackUsers.set(cleanEmail, mockUser);
      }

      const token = generateToken(mockUser.id, mockUser.email);
      return res.json({
        success: true,
        isNewUser,
        token,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          walletBalance: mockUser.walletBalance,
          upiId: mockUser.upiId,
          avatar: mockUser.avatar,
        },
      });
    }
  } catch (error: any) {
    console.error('Email Auth Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during authentication' });
  }
};

export const signup = async (req: Request, res: Response) => {
  return login(req, res);
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            walletBalance: user.walletBalance,
            upiId: user.upiId,
            avatar: user.avatar,
          },
        });
      }
    } catch (dbErr) {
      for (const [_, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id || u.email === req.user.email) {
          return res.json({
            success: true,
            user: {
              id: u.id,
              name: u.name,
              email: u.email,
              walletBalance: u.walletBalance,
              upiId: u.upiId,
              avatar: u.avatar,
            },
          });
        }
      }
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { delta } = req.body;
    if (!req.user || typeof delta !== 'number') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.walletBalance = Math.max(0, (user.walletBalance || 0) + delta);
        await user.save();
        return res.json({ success: true, walletBalance: user.walletBalance });
      }
    } catch (dbErr) {
      for (const [email, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id || u.email === req.user.email) {
          u.walletBalance = Math.max(0, (u.walletBalance || 0) + delta);
          fallbackUsers.set(email, u);
          return res.json({ success: true, walletBalance: u.walletBalance });
        }
      }
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateCoins = updateWallet;
