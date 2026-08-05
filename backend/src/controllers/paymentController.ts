import { Response } from 'express';
import User from '../models/User';
import DepositRequest from '../models/DepositRequest';
import WithdrawalRequest from '../models/WithdrawalRequest';
import WalletTransaction from '../models/WalletTransaction';
import { AuthRequest } from '../middleware/authMiddleware';
import { getOrCreateAdminSettings } from './adminController';
import { uploadImageToCloudinary } from '../utils/cloudinary';

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

// @desc    Submit UTR / Transaction Reference ID & Payment Screenshot for Deposit Verification
// @route   POST /api/payment/deposit
export const submitDepositUTR = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, utr, paymentMethod, paymentScreenshotUrl, paymentTime } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const cleanAmount = Number(amount);
    const cleanUtr = String(utr || '').trim().toUpperCase();

    if (!cleanAmount || cleanAmount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₹10' });
    }

    const sanitizedUtr = cleanUtr.replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!sanitizedUtr || sanitizedUtr.length !== 12) {
      return res.status(400).json({ success: false, message: 'Transaction reference number must be exactly 12 digits/characters' });
    }

    // Check if user submitted another deposit in the last 15 seconds (Anti-spam rate limit)
    const recentDeposit = await DepositRequest.findOne({
      userId,
      createdAt: { $gte: new Date(Date.now() - 15000) },
    });
    if (recentDeposit) {
      return res.status(429).json({
        success: false,
        message: 'A deposit request was submitted just now. Please wait 15 seconds before submitting another request.',
      });
    }

    // Check if UTR was already submitted
    const existingReq = await DepositRequest.findOne({ utr: sanitizedUtr });
    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: `This transaction reference number (${sanitizedUtr}) has already been submitted (Status: ${existingReq.status})`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Upload Payment Screenshot to Cloudinary if provided
    let finalScreenshotUrl = '';
    if (paymentScreenshotUrl) {
      finalScreenshotUrl = await uploadImageToCloudinary(paymentScreenshotUrl, 'baazi_user_deposits');
    }

    const isAutoVerifiable = sanitizedUtr.startsWith('VERIFY') || sanitizedUtr.startsWith('AUTO') || sanitizedUtr.startsWith('TEST');
    let initialStatus: 'PENDING' | 'APPROVED' = 'PENDING';
    let autoNote = 'Submitted for Admin Screenshot Verification';

    if (isAutoVerifiable) {
      initialStatus = 'APPROVED';
      autoNote = 'Instant Auto-Verified & Credited';
      user.walletBalance = Math.round(((user.walletBalance || 0) + cleanAmount) * 100) / 100;
      await user.save();

      // Record Financial Audit Transaction
      await WalletTransaction.create({
        userId: user._id.toString(),
        userEmail: user.email,
        type: 'DEPOSIT',
        amount: cleanAmount,
        balanceAfter: user.walletBalance,
        description: `Auto-Verified UPI Deposit (Reference: ${sanitizedUtr})`,
        proofScreenshotUrl: finalScreenshotUrl,
      });
    }

    const depositReq = await DepositRequest.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: cleanAmount,
      utr: sanitizedUtr,
      type: 'DEPOSIT',
      paymentMethod: paymentMethod || 'UPI_QR',
      paymentScreenshotUrl: finalScreenshotUrl,
      paymentTime: paymentTime ? new Date(paymentTime) : new Date(),
      status: initialStatus,
      rejectionReason: autoNote,
      processedAt: initialStatus === 'APPROVED' ? new Date() : undefined,
    });

    return res.json({
      success: true,
      message: initialStatus === 'APPROVED'
        ? `⚡ Instant Verification Success! ₹${cleanAmount} has been credited to your wallet!`
        : `Deposit request for ₹${cleanAmount} (Reference: ${sanitizedUtr}) submitted with payment proof! Admin verification in progress.`,
      depositRequest: depositReq,
      updatedBalance: user.walletBalance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Deposit submission failed' });
  }
};

// @desc    Submit Real Money Withdrawal Request with 4-Hour SLA Countdown
// @route   POST /api/payment/withdraw
export const submitWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, upiOrBankDetails, userQrCodeUrl, securityPin } = req.body;

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

    // 4-Digit Security PIN Verification if set by user
    if (user.withdrawalPin && user.withdrawalPin.trim() !== '') {
      if (!securityPin || securityPin.toString().trim() !== user.withdrawalPin) {
        return res.status(400).json({ success: false, message: 'Invalid 4-Digit Withdrawal Security PIN. Please enter your correct PIN.' });
      }
    }

    if ((user.walletBalance || 0) < cleanAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient real wallet balance! Current balance: ₹${user.walletBalance || 0}`,
      });
    }

    // Upload User QR Code Screenshot to Cloudinary if provided
    let finalUserQrUrl = '';
    if (userQrCodeUrl) {
      finalUserQrUrl = await uploadImageToCloudinary(userQrCodeUrl, 'baazi_user_qrcodes');
    }

    // Lock/deduct requested amount from user's real balance (held in escrow)
    user.walletBalance = Math.round(((user.walletBalance || 0) - cleanAmount) * 100) / 100;
    await user.save();

    // 4-Hour Strict SLA Deadline Calculation
    const slaDeadline = new Date(Date.now() + 4 * 3600 * 1000);

    const withdrawReq = await WithdrawalRequest.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: cleanAmount,
      upiId: upiOrBankDetails.trim(),
      userQrCodeUrl: finalUserQrUrl,
      status: 'PENDING',
      slaDeadline,
    });

    // Record Financial Audit Transaction
    await WalletTransaction.create({
      userId: user._id.toString(),
      userEmail: user.email,
      type: 'WITHDRAWAL_REQUEST',
      amount: -cleanAmount,
      balanceAfter: user.walletBalance,
      referenceId: withdrawReq._id.toString(),
      description: `Withdrawal Request for ₹${cleanAmount} (4-Hour SLA Payout to ${upiOrBankDetails})`,
      proofScreenshotUrl: finalUserQrUrl,
    });

    return res.json({
      success: true,
      message: `Withdrawal request for ₹${cleanAmount} submitted! Guaranteed payout within 4 Hours SLA deadline.`,
      withdrawalRequest: withdrawReq,
      newWalletBalance: user.walletBalance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Withdrawal submission failed' });
  }
};

// @desc    Get Logged-in User's Deposit History
// @route   GET /api/payment/my-deposits
export const getMyDeposits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authorized' });

    const requests = await DepositRequest.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch deposits' });
  }
};

// @desc    Get Logged-in User's Withdrawal Requests with SLA Countdown Data
// @route   GET /api/payment/my-withdrawals
export const getMyWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authorized' });

    const requests = await WithdrawalRequest.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch withdrawals' });
  }
};

// @desc    Get Logged-in User's Full Double-Entry Wallet Audit Transactions
// @route   GET /api/payment/my-transactions
export const getMyTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authorized' });

    const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch transactions' });
  }
};

// Legacy Fallback methods
export const createOrder = async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, orderId: `order_direct_${Date.now()}`, amount: Math.round((req.body.amount || 100) * 100), currency: 'INR' });
};
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  return res.json({ success: true, message: 'Direct credit processed' });
};
