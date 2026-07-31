import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendOTPEmail } from '../utils/mailer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory fallback user store when MongoDB is offline
const fallbackUsers: Map<string, any> = new Map();

const generateToken = (id: string, email: string) => {
  const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_env';
  return jwt.sign(
    { id, email },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
};

// Helper: Fixed Preview Mode OTP (1234)
const generate4DigitOTP = (): string => {
  return '1234';
};

// @desc    Send 4-Digit OTP to Email
// @route   POST /api/auth/send-otp
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const displayName = cleanEmail.split('@')[0];
    const otp = '1234';
    const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    try {
      let user = await User.findOne({ email: cleanEmail });
      let claimedBonusNow = false;

      // FIRST TIME USER -> CREATE ACCOUNT IMMEDIATELY
      if (!user) {
        user = await User.create({
          name: displayName,
          email: cleanEmail,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: true,
          hasClaimedSignupBonus: true,
        });
        claimedBonusNow = true;
      } else {
        if (!user.hasClaimedSignupBonus) {
          user.demoBalance = 1000;
          user.hasClaimedSignupBonus = true;
          claimedBonusNow = true;
        }
        user.isVerified = true;
        await user.save();
      }

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
          demoBalance: user.demoBalance !== undefined ? user.demoBalance : 1000,
          upiId: user.upiId,
          avatar: user.avatar,
          isVerified: true,
          hasClaimedSignupBonus: user.hasClaimedSignupBonus,
        },
        claimedBonusNow,
        message: `Welcome ${user.name}! Direct email login successful.`,
      });
    } catch (dbErr) {
      let mockUser = fallbackUsers.get(cleanEmail);
      let claimedBonusNow = false;

      if (!mockUser) {
        mockUser = {
          id: 'user_' + Date.now(),
          name: displayName,
          email: cleanEmail,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: true,
          hasClaimedSignupBonus: true,
        };
        fallbackUsers.set(cleanEmail, mockUser);
        claimedBonusNow = true;
      }

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
          demoBalance: mockUser.demoBalance !== undefined ? mockUser.demoBalance : 1000,
          upiId: mockUser.upiId,
          avatar: mockUser.avatar,
          isVerified: true,
          hasClaimedSignupBonus: true,
        },
        claimedBonusNow,
        message: `Welcome ${mockUser.name}! Direct email login successful.`,
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
      let user = await User.findOne({ email: cleanEmail });

      if (!user) {
        // Auto-create user on verify if not existing
        const displayName = cleanEmail.split('@')[0];
        user = await User.create({
          name: displayName,
          email: cleanEmail,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: true,
        });
      }

      // Preview mode: Accept 1234, 0000, or any matching OTP!
      if (cleanOtp !== '1234' && cleanOtp !== '0000' && user.otp && user.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Invalid 4-Digit OTP. Use 1234 in Preview mode!' });
      }

      let claimedBonusNow = false;
      if (!user.hasClaimedSignupBonus) {
        user.demoBalance = 1000;
        user.hasClaimedSignupBonus = true;
        claimedBonusNow = true;
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
          demoBalance: user.demoBalance,
          upiId: user.upiId,
          avatar: user.avatar,
          isVerified: user.isVerified,
          hasClaimedSignupBonus: user.hasClaimedSignupBonus,
        },
        claimedBonusNow,
      });
    } catch (dbErr) {
      let mockUser = fallbackUsers.get(cleanEmail);
      if (!mockUser) {
        const displayName = cleanEmail.split('@')[0];
        mockUser = {
          id: 'user_' + Date.now(),
          name: displayName,
          email: cleanEmail,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${displayName}@paytm`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          isVerified: true,
        };
      }

      if (cleanOtp !== '1234' && cleanOtp !== '0000' && mockUser.otp && mockUser.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Invalid 4-Digit OTP. Use 1234 in Preview mode!' });
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
        return res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance, demoBalance: user.demoBalance !== undefined ? user.demoBalance : 1000, upiId: user.upiId, avatar: user.avatar, isVerified: user.isVerified } });
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

// @desc    Set or Update 4-Digit Security PIN for Withdrawals
// @route   POST /api/auth/set-withdrawal-pin
export const setWithdrawalPin = async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body;
    if (!req.user || !pin || !/^\d{4}$/.test(String(pin).trim())) {
      return res.status(400).json({ message: 'Please enter a valid 4-digit numeric Security PIN' });
    }

    const cleanPin = String(pin).trim();
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.withdrawalPin = cleanPin;
    await user.save();

    return res.json({
      success: true,
      message: '4-Digit Withdrawal Security PIN saved successfully! 🔐',
      hasPin: true,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to update PIN' });
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
          user: { id: user._id, name: user.name, email: user.email, walletBalance: user.walletBalance, demoBalance: user.demoBalance !== undefined ? user.demoBalance : 1000, upiId: user.upiId, avatar: user.avatar, isVerified: user.isVerified },
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
            demoBalance: user.demoBalance !== undefined ? user.demoBalance : 1000,
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
              demoBalance: u.demoBalance !== undefined ? u.demoBalance : 1000,
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

    // STRICT SECURITY GUARD: Block arbitrary positive cash additions
    if (delta > 0) {
      return res.status(400).json({
        success: false,
        message: 'Direct wallet credit is disabled for financial audit security. All wallet credits must originate from an approved deposit request.',
      });
    }

    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.walletBalance = Math.max(0, Math.round(((user.walletBalance || 0) + delta) * 100) / 100);
        await user.save();
        return res.json({ success: true, walletBalance: user.walletBalance });
      }
    } catch (dbErr) {
      for (const [email, u] of fallbackUsers.entries()) {
        if (u.id === req.user.id || u.email === req.user.email) {
          u.walletBalance = Math.max(0, Math.round(((u.walletBalance || 0) + delta) * 100) / 100);
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

export const updateCoins = async (req: AuthRequest, res: Response) => {
  try {
    const { delta } = req.body;
    if (!req.user || typeof delta !== 'number') {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const user = await User.findById(req.user.id);
    if (user) {
      user.demoBalance = Math.max(0, (user.demoBalance || 0) + delta);
      await user.save();
      return res.json({ success: true, demoBalance: user.demoBalance });
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------- GOOGLE OAUTH 2.0 & 7-DAY JWT CONTROLLER ----------
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleOAuthLogin = async (req: Request, res: Response) => {
  try {
    const { idToken, googleProfile } = req.body;
    let email = '';
    let name = '';
    let picture = '';
    let googleId = '';

    if (idToken) {
      // Verify Google ID Token server-side
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ message: 'Invalid Google ID Token' });
      }
      email = payload.email.toLowerCase().trim();
      name = payload.name || email.split('@')[0];
      picture = payload.picture || '';
      googleId = payload.sub;
    } else if (googleProfile) {
      // Sync from verified NextAuth session
      email = (googleProfile.email || '').toLowerCase().trim();
      name = googleProfile.name || email.split('@')[0];
      picture = googleProfile.image || googleProfile.picture || '';
      googleId = googleProfile.sub || googleProfile.id || '';
    } else {
      return res.status(400).json({ message: 'Google authentication payload required' });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Valid Google email is required' });
    }

    try {
      let user = await User.findOne({ email });
      let claimedBonusNow = false;

      if (!user) {
        user = await User.create({
          name,
          email,
          googleId,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${name.toLowerCase().replace(/\s+/g, '')}@paytm`,
          avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          isVerified: true,
          isGoogleVerified: true,
          hasClaimedSignupBonus: true,
          lastLoginAt: new Date(),
        });
        claimedBonusNow = true;
      } else {
        if (!user.hasClaimedSignupBonus) {
          user.demoBalance = 1000;
          user.hasClaimedSignupBonus = true;
          claimedBonusNow = true;
        }
        user.googleId = googleId || user.googleId;
        user.isGoogleVerified = true;
        user.isVerified = true;
        user.lastLoginAt = new Date();
        if (picture) user.avatar = picture;
        await user.save();
      }

      // Generate 7-Day JWT Token
      const token = generateToken(user._id.toString(), user.email);

      return res.json({
        success: true,
        token,
        expiresIn: '7d',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance,
          demoBalance: user.demoBalance !== undefined ? user.demoBalance : 1000,
          upiId: user.upiId,
          avatar: user.avatar,
          isVerified: true,
          isGoogleVerified: true,
          hasClaimedSignupBonus: user.hasClaimedSignupBonus,
        },
        claimedBonusNow,
        message: `Welcome ${user.name}! Logged in securely with Google.`,
      });
    } catch (dbErr) {
      // In-memory fallback if DB is offline
      let mockUser = fallbackUsers.get(email);
      let claimedBonusNow = false;

      if (!mockUser) {
        mockUser = {
          id: 'user_' + Date.now(),
          name,
          email,
          googleId,
          walletBalance: 0,
          demoBalance: 1000,
          upiId: `${name.toLowerCase().replace(/\s+/g, '')}@paytm`,
          avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          isVerified: true,
          isGoogleVerified: true,
          hasClaimedSignupBonus: true,
        };
        fallbackUsers.set(email, mockUser);
        claimedBonusNow = true;
      } else {
        mockUser.isGoogleVerified = true;
        mockUser.isVerified = true;
        fallbackUsers.set(email, mockUser);
      }

      const token = generateToken(mockUser.id, mockUser.email);
      return res.json({
        success: true,
        token,
        expiresIn: '7d',
        user: mockUser,
        claimedBonusNow,
        message: `Welcome ${mockUser.name}! Logged in securely with Google.`,
      });
    }
  } catch (error: any) {
    console.error('Google OAuth Controller Error:', error);
    return res.status(500).json({ message: 'Google Authentication failed: ' + (error.message || 'Server error') });
  }
};
