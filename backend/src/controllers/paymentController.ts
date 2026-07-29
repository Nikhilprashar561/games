import { Response } from 'express';
import User from '../models/User';
import DepositRequest from '../models/DepositRequest';
import AdminSettings from '../models/AdminSettings';
import { AuthRequest } from '../middleware/authMiddleware';
import { getOrCreateAdminSettings } from './adminController';

// @desc    Get Active Admin QR Code, UPI ID & Bank Details for User Payment
// @route   GET /api/payment/config
export const getPublicPaymentConfig = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getOrCreateAdminSettings();
    return res.json({
      success: true,
      config: {
        qrCodeUrl: settings.qrCodeUrl,
        upiId: settings.upiId,
        upiHolderName: settings.upiHolderName,
        bankName: settings.bankName,
        accountNumber: settings.accountNumber,
        ifscCode: settings.ifscCode,
        minDeposit: settings.minDeposit,
        minWithdrawal: settings.minWithdrawal,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load payment details' });
  }
};

// @desc    Submit UTR / Transaction Reference ID for QR / UPI Deposit Verification
// @route   POST /api/payment/deposit
export const submitDepositUTR = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, utr, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const cleanAmount = Number(amount);
    const cleanUtr = String(utr || '').trim().toUpperCase();

    if (!cleanAmount || cleanAmount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₹10' });
    }

    if (!cleanUtr || cleanUtr.length < 6) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit UTR / Reference ID' });
    }

    // Check if this UTR has already been submitted
    const existingReq = await DepositRequest.findOne({ utr: cleanUtr });
    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: `This UTR (${cleanUtr}) has already been submitted (Status: ${existingReq.status})`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const depositReq = await DepositRequest.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: cleanAmount,
      utr: cleanUtr,
      type: 'DEPOSIT',
      paymentMethod: paymentMethod || 'UPI_QR',
      status: 'PENDING',
    });

    return res.json({
      success: true,
      message: `Deposit request for ₹${cleanAmount} (UTR: ${cleanUtr}) submitted successfully! Verification pending by Admin.`,
      depositRequest: depositReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Deposit submission failed' });
  }
};

// @desc    Submit Real Money Withdrawal Request
// @route   POST /api/payment/withdraw
export const submitWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, upiOrBankDetails } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const cleanAmount = Number(amount);
    if (!cleanAmount || cleanAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
    }

    if (!upiOrBankDetails || upiOrBankDetails.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID or Bank details for payout' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    if ((user.walletBalance || 0) < cleanAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient real wallet balance! Current balance: ₹${user.walletBalance || 0}`,
      });
    }

    // Lock/deduct the requested amount from user's real balance
    user.walletBalance = user.walletBalance - cleanAmount;
    await user.save();

    const utrCode = `WD_${Date.now()}`;
    const withdrawReq = await DepositRequest.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: cleanAmount,
      utr: utrCode,
      type: 'WITHDRAWAL',
      paymentMethod: 'UPI_BANK',
      upiOrBankDetails: upiOrBankDetails.trim(),
      status: 'PENDING',
    });

    return res.json({
      success: true,
      message: `Withdrawal request for ₹${cleanAmount} submitted! Payout will be processed by Admin to ${upiOrBankDetails}.`,
      depositRequest: withdrawReq,
      newWalletBalance: user.walletBalance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Withdrawal submission failed' });
  }
};

// @desc    Get Current Logged In User's Deposit & Withdrawal History
// @route   GET /api/payment/my-deposits
export const getMyDeposits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const requests = await DepositRequest.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch transaction history' });
  }
};

// Legacy Razorpay / direct credit fallback
export const createOrder = async (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    orderId: `order_direct_${Date.now()}`,
    amount: Math.round((req.body.amount || 100) * 100),
    currency: 'INR',
  });
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    message: 'Direct credit processed',
  });
};
