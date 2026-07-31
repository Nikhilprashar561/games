import express from 'express';
import {
  signup,
  login,
  sendOTP,
  verifyOTP,
  getMe,
  updateCoins,
  updateName,
  requestEmailChange,
  verifyEmailChange,
  googleOAuthLogin,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Google OAuth 2.0 Auth Routes
router.post('/google', googleOAuthLogin);
router.post('/google-sync', googleOAuthLogin);

router.post('/signup', signup);
router.post('/login', login);

// OTP Authentication Routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected Profile & OTP Management Routes
router.get('/me', protect, getMe);
router.post('/update-coins', protect, updateCoins);
router.post('/update-name', protect, updateName);
router.post('/request-email-change', protect, requestEmailChange);
router.post('/verify-email-change', protect, verifyEmailChange);

export default router;
