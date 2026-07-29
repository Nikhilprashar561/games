import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendOTPEmail } from '../utils/mailer';

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

// Helper: Generate 4-digit numeric OTP
const generate4DigitOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// @desc    Send 4-Digit OTP to Email
// @route   POST /api/auth/send-otp
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid real email address (e.g., user@gmail.com)' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const displayName = cleanEmail.split('@')[0];
    const otp = generate4DigitOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    try {
      let user = await User.findOne({ email: cleanEmail });

      // EXISTING USER -> DIRECT LOGIN ACCEPTED WITHOUT OTP!
      if (user && user.isVerified) {
        const token = generateToken(user._id.toString(), user.email);
        return res.json({
          success: true,
          isExistingUser: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            walletBalance: user.walletBalance,
            upiId: user.upiId,
            avatar: user.avatar,
            isVerified: true,
          },
          message: `Welcome back, ${user.name}! Direct login successful.`,
        });
      }

      // FIRST TIME USER -> CREATE ACCOUNT & SEND OTP
      if (!user) {
        user = await User.create({
          name: displayName,
          email: cleanEmail,
          walletBalance: 500,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: false,
          otp,
          otpExpires,
        });
      } else {
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
      }

      await sendOTPEmail(cleanEmail, otp, user.name);
      return res.json({
        success: true,
        isExistingUser: false,
        message: `First-time registration: 4-Digit OTP sent to ${cleanEmail}. Please check your inbox!`,
      });
    } catch (dbErr) {
      let mockUser = fallbackUsers.get(cleanEmail);

      // EXISTING FALLBACK USER -> DIRECT LOGIN
      if (mockUser && mockUser.isVerified) {
        const token = generateToken(mockUser.id, mockUser.email);
        return res.json({
          success: true,
          isExistingUser: true,
          token,
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            walletBalance: mockUser.walletBalance,
            upiId: mockUser.upiId,
            avatar: mockUser.avatar,
            isVerified: true,
          },
          message: `Welcome back, ${mockUser.name}! Direct login successful.`,
        });
      }

      // FIRST TIME FALLBACK USER -> SEND OTP
      if (!mockUser) {
        mockUser = {
          id: 'user_' + Date.now(),
          name: displayName,
          email: cleanEmail,
          walletBalance: 500,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: false,
          otp,
          otpExpires,
        };
      } else {
        mockUser.otp = otp;
        mockUser.otpExpires = otpExpires;
      }
      fallbackUsers.set(cleanEmail, mockUser);

      await sendOTPEmail(cleanEmail, otp, mockUser.name);
      return res.json({
        success: true,
        isExistingUser: false,
        message: `First-time registration: 4-Digit OTP sent to ${cleanEmail}. Please check your inbox!`,
      });
    }
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to process login / OTP request' });
  }
};

// @desc    Verify 4-Digit OTP & Login / Register
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 4-Digit OTP are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    try {
      const user = await User.findOne({ email: cleanEmail });

      if (!user) {
        return res.status(404).json({ message: 'User not found. Please request a new OTP.' });
      }

      if (user.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Invalid 4-Digit OTP. Please try again!' });
      }

      if (user.otpExpires && new Date() > user.otpExpires) {
        return res.status(400).json({ message: 'OTP expired. Please request a new OTP!' });
      }

      // Mark User as Verified!
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = generateToken(user._id.toString(), user.email);

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance,
          upiId: user.upiId,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      });
    } catch (dbErr) {
      const mockUser = fallbackUsers.get(cleanEmail);
      if (!mockUser || mockUser.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Invalid 4-Digit OTP code' });
      }

      mockUser.isVerified = true;
      mockUser.otp = undefined;
      fallbackUsers.set(cleanEmail, mockUser);

      const token = generateToken(mockUser.id, mockUser.email);
      return res.json({
        success: true,
        token,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          walletBalance: mockUser.walletBalance,
          upiId: mockUser.upiId,
          avatar: mockUser.avatar,
          isVerified: mockUser.isVerified,
        },
      });
    }
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ message: error.message || 'OTP verification failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  return sendOTP(req, res);
};

export const signup = async (req: Request, res: Response) => {
  return sendOTP(req, res);
};

// @desc    Update Display Name
// @route   POST /api/auth/update-name
export const updateName = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!req.user || !name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const cleanName = name.trim();

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.name = cleanName;
        await user.save();
        return res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance, avatar: user.avatar, isVerified: user.isVerified } });
      }
    } catch (err) {
      for (const [email, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id) {
          u.name = cleanName;
          fallbackUsers.set(email, u);
          return res.json({ success: true, user: u });
        }
      }
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Request Email Change OTP
// @route   POST /api/auth/request-email-change
export const requestEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const { newEmail } = req.body;
    if (!req.user || !newEmail || !EMAIL_REGEX.test(newEmail.trim())) {
      return res.status(400).json({ message: 'Please enter a valid new email address' });
    }

    const cleanNewEmail = newEmail.toLowerCase().trim();
    const otp = generate4DigitOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    try {
      const existing = await User.findOne({ email: cleanNewEmail });
      if (existing) {
        return res.status(400).json({ message: 'This email is already registered to another account' });
      }

      const user = await User.findById(req.user.id);
      if (user) {
        user.pendingEmail = cleanNewEmail;
        user.pendingEmailOtp = otp;
        user.pendingEmailOtpExpires = otpExpires;
        await user.save();

        await sendOTPEmail(cleanNewEmail, otp, user.name, true);
        return res.json({ success: true, message: `Verification OTP sent to ${cleanNewEmail}` });
      }
    } catch (err) {
      // Fallback
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Email Change OTP
// @route   POST /api/auth/verify-email-change
export const verifyEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const { newEmail, otp } = req.body;
    if (!req.user || !newEmail || !otp) {
      return res.status(400).json({ message: 'New email and 4-digit OTP are required' });
    }

    const cleanNewEmail = newEmail.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        if (user.pendingEmail !== cleanNewEmail || user.pendingEmailOtp !== cleanOtp) {
          return res.status(400).json({ message: 'Invalid 4-digit OTP code' });
        }

        user.email = cleanNewEmail;
        user.pendingEmail = undefined;
        user.pendingEmailOtp = undefined;
        user.pendingEmailOtpExpires = undefined;
        await user.save();

        const newToken = generateToken(user._id.toString(), user.email);
        return res.json({
          success: true,
          token: newToken,
          user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance, avatar: user.avatar, isVerified: user.isVerified },
        });
      }
    } catch (err) {
      // Fallback
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
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
            isVerified: user.isVerified,
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
              isVerified: u.isVerified || true,
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
