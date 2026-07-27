import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

// In-memory fallback user store when MongoDB is offline
const fallbackUsers: Map<string, any> = new Map();

const generateToken = (id: string, email: string) => {
  return jwt.sign(
    { id, email },
    process.env.JWT_SECRET || 'super_secret_game_jwt_key_2026_antigravity',
    { expiresIn: '30d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/signup
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Please provide both name and email' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userPassword = password || '123456';

    try {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userPassword, salt);

      const user = await User.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        coins: 100,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      });

      const token = generateToken(user._id.toString(), user.email);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          coins: user.coins,
          avatar: user.avatar,
        },
      });
    } catch (dbErr) {
      // MongoDB unreachable fallback for dev testing
      console.warn('[DB Fallback] MongoDB unavailable, using fallback storage');
      const userId = 'user_' + Date.now();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userPassword, salt);

      const mockUser = {
        id: userId,
        name,
        email: cleanEmail,
        password: hashedPassword,
        coins: 100,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      };

      fallbackUsers.set(cleanEmail, mockUser);
      const token = generateToken(userId, cleanEmail);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          coins: mockUser.coins,
          avatar: mockUser.avatar,
        },
      });
    }
  } catch (error: any) {
    console.error('Signup Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during signup' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userPassword = password || '123456';

    try {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        const isMatch = await bcrypt.compare(userPassword, user.password || '');
        if (!isMatch && password) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id.toString(), user.email);
        return res.json({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            coins: user.coins,
            avatar: user.avatar,
          },
        });
      }
    } catch (dbErr) {
      // Fallback check
      if (fallbackUsers.has(cleanEmail)) {
        const mockUser = fallbackUsers.get(cleanEmail);
        const token = generateToken(mockUser.id, mockUser.email);
        return res.json({
          success: true,
          token,
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            coins: mockUser.coins,
            avatar: mockUser.avatar,
          },
        });
      }
    }

    // Auto-create account if logging in for first time without signup step
    const defaultName = cleanEmail.split('@')[0];
    return signup(req, res);

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        return res.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            coins: user.coins,
            avatar: user.avatar,
          },
        });
      }
    } catch (dbErr) {
      // Check fallback memory
      for (const [_, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id || u.email === req.user.email) {
          return res.json({
            success: true,
            user: {
              id: u.id,
              name: u.name,
              email: u.email,
              coins: u.coins,
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

// @desc    Update user coins (for game betting/winning)
// @route   POST /api/auth/update-coins
export const updateCoins = async (req: AuthRequest, res: Response) => {
  try {
    const { delta } = req.body; // e.g. -10 or +50
    if (!req.user || typeof delta !== 'number') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.coins = Math.max(0, user.coins + delta);
        await user.save();
        return res.json({ success: true, coins: user.coins });
      }
    } catch (dbErr) {
      for (const [email, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id || u.email === req.user.email) {
          u.coins = Math.max(0, u.coins + delta);
          fallbackUsers.set(email, u);
          return res.json({ success: true, coins: u.coins });
        }
      }
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
