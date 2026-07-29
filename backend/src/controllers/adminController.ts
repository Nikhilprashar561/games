import { Request, Response } from 'express';
import DepositRequest from '../models/DepositRequest';
import AdminSettings from '../models/AdminSettings';
import User from '../models/User';

// Helper to get or create default AdminSettings
export const getOrCreateAdminSettings = async () => {
  let settings = await AdminSettings.findOne();
  if (!settings) {
    settings = await AdminSettings.create({
      qrCodeUrl: '/images/payment_qr.jpg',
      upiId: 'baaziboard@paytm',
      upiHolderName: 'Baazi Board Official',
      bankName: 'HDFC Bank',
      accountNumber: '50100234567890',
      ifscCode: 'HDFC0001234',
      minDeposit: 100,
      minWithdrawal: 200,
      adminPasscode: 'admin123',
    });
  }
  return settings;
};

// @desc    Admin Passcode Login
// @route   POST /api/admin/login
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { passcode } = req.body;
    const settings = await getOrCreateAdminSettings();

    if (!passcode || passcode !== settings.adminPasscode) {
      return res.status(401).json({ success: false, message: 'Invalid Admin Passcode!' });
    }

    return res.json({
      success: true,
      message: 'Admin Authentication Successful!',
      token: 'admin_authenticated_session_token',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Admin login failed' });
  }
};

// @desc    Get All Deposit/Withdrawal Requests (with UTR search & status filter)
// @route   GET /api/admin/deposits
export const getDeposits = async (req: Request, res: Response) => {
  try {
    const { status, search, type } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (type && type !== 'ALL') {
      filter.type = type;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [
        { utr: searchRegex },
        { userEmail: searchRegex },
        { userName: searchRegex },
      ];
    }

    const requests = await DepositRequest.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch deposits' });
  }
};

// @desc    Approve UTR Deposit / Withdrawal Request
// @route   POST /api/admin/deposits/approve
export const approveDeposit = async (req: Request, res: Response) => {
  try {
    const { requestId, adminNote } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    const depositReq = await DepositRequest.findById(requestId);
    if (!depositReq) {
      return res.status(404).json({ success: false, message: 'Deposit/Withdrawal request not found' });
    }

    if (depositReq.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${depositReq.status}`,
      });
    }

    const user = await User.findById(depositReq.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    // Process logic depending on type
    if (depositReq.type === 'DEPOSIT') {
      // Automatically credit real money wallet balance of user
      user.walletBalance = (user.walletBalance || 0) + depositReq.amount;
      await user.save();
    }

    depositReq.status = 'APPROVED';
    depositReq.processedAt = new Date();
    if (adminNote) depositReq.rejectionReason = adminNote;
    await depositReq.save();

    return res.json({
      success: true,
      message: `Successfully APPROVED UTR ${depositReq.utr}! credited ₹${depositReq.amount} to ${user.email}.`,
      depositRequest: depositReq,
      updatedUserBalance: user.walletBalance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Approval failed' });
  }
};

// @desc    Reject UTR Deposit / Withdrawal Request
// @route   POST /api/admin/deposits/reject
export const rejectDeposit = async (req: Request, res: Response) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    const depositReq = await DepositRequest.findById(requestId);
    if (!depositReq) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (depositReq.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${depositReq.status}`,
      });
    }

    const user = await User.findById(depositReq.userId);

    // If withdrawal was rejected, refund the locked amount back to user's wallet
    if (depositReq.type === 'WITHDRAWAL' && user) {
      user.walletBalance = (user.walletBalance || 0) + depositReq.amount;
      await user.save();
    }

    depositReq.status = 'REJECTED';
    depositReq.rejectionReason = reason || 'Invalid UTR / Transaction verification failed';
    depositReq.processedAt = new Date();
    await depositReq.save();

    return res.json({
      success: true,
      message: `Request REJECTED for UTR ${depositReq.utr}`,
      depositRequest: depositReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Rejection failed' });
  }
};

// @desc    Get Admin Config (QR, UPI ID, Bank details)
// @route   GET /api/admin/config
export const getAdminConfig = async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateAdminSettings();
    return res.json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch admin settings' });
  }
};

// @desc    Update Admin Config (QR Code image, UPI ID, Bank details, Enable Toggles)
// @route   POST /api/admin/config
export const updateAdminConfig = async (req: Request, res: Response) => {
  try {
    const { qrCodeUrl, upiId, upiHolderName, bankName, accountNumber, ifscCode, minDeposit, minWithdrawal, adminPasscode, isQrEnabled, isBankEnabled } = req.body;
    let settings = await getOrCreateAdminSettings();

    if (qrCodeUrl !== undefined) settings.qrCodeUrl = qrCodeUrl;
    if (upiId !== undefined) settings.upiId = upiId;
    if (upiHolderName !== undefined) settings.upiHolderName = upiHolderName;
    if (bankName !== undefined) settings.bankName = bankName;
    if (accountNumber !== undefined) settings.accountNumber = accountNumber;
    if (ifscCode !== undefined) settings.ifscCode = ifscCode;
    if (minDeposit !== undefined) settings.minDeposit = Number(minDeposit);
    if (minWithdrawal !== undefined) settings.minWithdrawal = Number(minWithdrawal);
    if (adminPasscode !== undefined && adminPasscode.trim() !== '') settings.adminPasscode = adminPasscode;
    if (isQrEnabled !== undefined) settings.isQrEnabled = Boolean(isQrEnabled);
    if (isBankEnabled !== undefined) settings.isBankEnabled = Boolean(isBankEnabled);

    settings.updatedAt = new Date();
    await settings.save();

    return res.json({
      success: true,
      message: 'Admin QR & UPI settings updated successfully!',
      settings,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update admin settings' });
  }
};

// @desc    Get Overall Admin Dashboard Statistics
// @route   GET /api/admin/stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingCount = await DepositRequest.countDocuments({ status: 'PENDING' });
    const approvedCount = await DepositRequest.countDocuments({ status: 'APPROVED' });
    const rejectedCount = await DepositRequest.countDocuments({ status: 'REJECTED' });

    const approvedDeposits = await DepositRequest.aggregate([
      { $match: { status: 'APPROVED', type: 'DEPOSIT' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const approvedWithdrawals = await DepositRequest.aggregate([
      { $match: { status: 'APPROVED', type: 'WITHDRAWAL' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalDepositAmount = approvedDeposits[0]?.total || 0;
    const totalWithdrawalAmount = approvedWithdrawals[0]?.total || 0;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalDepositAmount,
        totalWithdrawalAmount,
        netRevenue: totalDepositAmount - totalWithdrawalAmount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch admin stats' });
  }
};

// @desc    Get All Registered Users for Admin Distribution
// @route   GET /api/admin/users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-otp -otpExpires -pendingEmailOtp').sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch users' });
  }
};

// @desc    Adjust (Credit/Debit) Real Money or Demo Coins for User
// @route   POST /api/admin/users/adjust-balance
export const adjustUserBalance = async (req: Request, res: Response) => {
  try {
    const { userId, type, delta } = req.body;
    if (!userId || delta === undefined) {
      return res.status(400).json({ success: false, message: 'User ID and amount required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const change = Number(delta);
    if (type === 'SET_REAL_ZERO') {
      user.walletBalance = 0;
    } else if (type === 'SET_REAL_EXACT') {
      user.walletBalance = Math.max(0, change);
    } else if (type === 'DEMO') {
      user.demoBalance = Math.max(0, (user.demoBalance !== undefined ? user.demoBalance : 10000) + change);
    } else {
      user.walletBalance = Math.max(0, (user.walletBalance || 0) + change);
    }

    await user.save();

    return res.json({
      success: true,
      message: `Updated ${user.email}'s ${type === 'DEMO' ? 'Demo Coins' : 'Real Wallet'} balance!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance,
        demoBalance: user.demoBalance,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to adjust balance' });
  }
};

// @desc    Bulk Reset All Users Real Cash Wallets to ₹0 in MongoDB
// @route   POST /api/admin/users/reset-all-wallets
export const resetAllUserWallets = async (req: Request, res: Response) => {
  try {
    const result = await User.updateMany({}, { $set: { walletBalance: 0 } });
    return res.json({
      success: true,
      message: `Successfully cleared real cash balance for all users in database! (${result.modifiedCount} accounts reset to ₹0)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to reset user wallets' });
  }
};

// @desc    Create Test UTR Deposit Request for Payment Flow Testing
// @route   POST /api/admin/deposits/create-test
export const createTestDeposit = async (req: Request, res: Response) => {
  try {
    const { amount, email } = req.body;
    const testAmount = Number(amount) || 500;
    
    let user = null;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }
    if (!user) {
      user = await User.findOne();
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found to attach test deposit to. Please register/login a user first.' });
    }

    const testUtr = `TEST_UTR_${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const testReq = await DepositRequest.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: testAmount,
      utr: testUtr,
      type: 'DEPOSIT',
      paymentMethod: 'UPI_QR_TEST',
      status: 'PENDING',
    });

    return res.json({
      success: true,
      message: `Created Mock Test Deposit of ₹${testAmount} (UTR: ${testUtr}) for ${user.email}`,
      depositRequest: testReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create test deposit' });
  }
};
