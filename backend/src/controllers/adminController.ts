import { Request, Response } from 'express';
import DepositRequest from '../models/DepositRequest';
import WithdrawalRequest from '../models/WithdrawalRequest';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import AdminSettings from '../models/AdminSettings';
import GameLog from '../models/GameLog';
import { uploadImageToCloudinary } from '../utils/cloudinary';

// @desc    Admin Passcode Verification Login
// @route   POST /api/admin/login
export const verifyAdminPasscode = async (req: Request, res: Response) => {
  try {
    const { passcode } = req.body;
    const settings = await AdminSettings.findOne({});
    const correctPasscode = settings?.adminPasscode || 'admin123';

    if (!passcode || passcode.trim() !== correctPasscode) {
      return res.status(401).json({ success: false, message: 'Invalid Admin Security Passcode' });
    }

    return res.json({
      success: true,
      message: 'Admin Passcode verified successfully!',
      token: 'admin_authenticated_' + Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Passcode verification failed' });
  }
};

// @desc    Get Deposits Queue (Filtered by Status: PENDING / UNDER_REVIEW / APPROVED / REJECTED)
// @route   GET /api/admin/deposits
export const getDeposits = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ userEmail: searchRegex }, { userName: searchRegex }, { utr: searchRegex }];
    }

    const requests = await DepositRequest.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch deposits' });
  }
};

// @desc    Get Withdrawal Requests (with 4-Hour SLA Timer Calculation)
// @route   GET /api/admin/withdrawals
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ userEmail: searchRegex }, { userName: searchRegex }, { upiId: searchRegex }];
    }

    const requests = await WithdrawalRequest.find(filter).sort({ createdAt: -1 });

    const now = new Date().getTime();
    const enriched = requests.map((r) => {
      const deadline = new Date(r.slaDeadline).getTime();
      const isSlaBreached = r.status === 'PENDING' && now > deadline;
      const msRemaining = Math.max(0, deadline - now);
      return {
        ...r.toObject(),
        isSlaBreached,
        msRemaining,
      };
    });

    return res.json({ success: true, count: enriched.length, requests: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch withdrawals' });
  }
};

// @desc    Approve Deposit Request (Single Record Lifecycle: Credits Verified Payment to User Wallet)
// @route   POST /api/admin/deposits/approve
export const approveDeposit = async (req: Request, res: Response) => {
  try {
    const { requestId, approvedAmount, adminNote, remarks, adminProofScreenshotUrl } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Deposit Request ID is required' });
    }

    const depositReq = await DepositRequest.findById(requestId);
    if (!depositReq) {
      return res.status(404).json({ success: false, message: 'Deposit request record not found' });
    }

    if (depositReq.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This deposit request has already been approved and credited.',
      });
    }

    if (depositReq.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'This deposit request was rejected. A new deposit request must be submitted by the user.',
      });
    }

    const user = await User.findById(depositReq.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user account not found' });
    }

    // Upload Admin Proof Screenshot if provided
    let finalProofUrl = depositReq.adminProofScreenshotUrl || '';
    if (adminProofScreenshotUrl) {
      finalProofUrl = await uploadImageToCloudinary(adminProofScreenshotUrl, 'baazi_admin_proofs');
    }

    const creditAmount = Number(approvedAmount) > 0 ? Number(approvedAmount) : depositReq.amount;

    // Credit real cash balance to user wallet ONLY via verified deposit approval
    user.walletBalance = Math.round(((user.walletBalance || 0) + creditAmount) * 100) / 100;
    await user.save();

    // Update single Deposit record with full approval lifecycle metadata
    depositReq.status = 'APPROVED';
    depositReq.approvedAmount = creditAmount;
    depositReq.approvedBy = (req as any).user?.email || 'Admin Portal';
    depositReq.approvalTime = new Date();
    depositReq.remarks = remarks || adminNote || 'Payment Verified & Wallet Credited';
    depositReq.adminNote = adminNote || remarks || 'Payment Verified & Wallet Credited';
    depositReq.adminProofScreenshotUrl = finalProofUrl;
    depositReq.processedAt = new Date();
    await depositReq.save();

    // Record Immutable Financial Audit Transaction Ledger
    await WalletTransaction.create({
      userId: user._id.toString(),
      userEmail: user.email,
      type: 'DEPOSIT',
      amount: creditAmount,
      balanceAfter: user.walletBalance,
      referenceId: depositReq._id.toString(),
      description: `Verified Deposit Credit (UTR: ${depositReq.utr})`,
      proofScreenshotUrl: depositReq.paymentScreenshotUrl || finalProofUrl,
    });

    // Referral Bonus: Credit ₹50 to referrer if this is the user's first approved deposit
    if (user.referredBy) {
      const priorApprovedDeposits = await DepositRequest.countDocuments({
        userId: user._id,
        status: 'APPROVED',
      });
      if (priorApprovedDeposits === 1) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          referrer.walletBalance = Math.round(((referrer.walletBalance || 0) + 50) * 100) / 100;
          referrer.referralEarnings = (referrer.referralEarnings || 0) + 50;
          await referrer.save();

          await WalletTransaction.create({
            userId: referrer._id.toString(),
            userEmail: referrer.email,
            type: 'DEPOSIT',
            amount: 50,
            balanceAfter: referrer.walletBalance,
            referenceId: user._id.toString(),
            description: `Referral Reward Bonus (Referred player ${user.name} made first deposit)`,
          });
        }
      }
    }

    return res.json({
      success: true,
      message: `Deposit APPROVED! Credited ₹${creditAmount} to ${user.name} (${user.email}).`,
      depositRequest: depositReq,
      updatedUserBalance: user.walletBalance,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Deposit approval failed' });
  }
};

// @desc    Reject Deposit Request (Single Record Lifecycle)
// @route   POST /api/admin/deposits/reject
export const rejectDeposit = async (req: Request, res: Response) => {
  try {
    const { requestId, reason, remarks } = req.body;
    if (!requestId) return res.status(400).json({ success: false, message: 'Deposit Request ID is required' });

    const depositReq = await DepositRequest.findById(requestId);
    if (!depositReq) return res.status(404).json({ success: false, message: 'Deposit request record not found' });

    if (depositReq.status !== 'PENDING' && depositReq.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ success: false, message: `Request is already ${depositReq.status}` });
    }

    const rejectionMsg = reason || remarks || 'Invalid UTR / Payment Verification Failed';

    depositReq.status = 'REJECTED';
    depositReq.approvedBy = (req as any).user?.email || 'Admin Portal';
    depositReq.approvalTime = new Date();
    depositReq.rejectionReason = rejectionMsg;
    depositReq.remarks = rejectionMsg;
    depositReq.adminNote = rejectionMsg;
    depositReq.processedAt = new Date();
    await depositReq.save();

    return res.json({
      success: true,
      message: `Deposit REJECTED for UTR ${depositReq.utr}`,
      depositRequest: depositReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Rejection failed' });
  }
};

// @desc    Process / Approve Withdrawal Request (Upload Admin Payout Screenshot + Enter Bank UTR)
// @route   POST /api/admin/withdrawals/approve
export const approveWithdrawal = async (req: Request, res: Response) => {
  try {
    const { requestId, adminPayoutScreenshotUrl, adminPayoutUtr, adminNote } = req.body;
    if (!requestId) return res.status(400).json({ success: false, message: 'Withdrawal Request ID is required' });

    const withdrawalReq = await WithdrawalRequest.findById(requestId);
    if (!withdrawalReq) return res.status(404).json({ success: false, message: 'Withdrawal request not found' });

    if (withdrawalReq.status !== 'PENDING' && withdrawalReq.status !== 'PROCESSING') {
      return res.status(400).json({ success: false, message: `Withdrawal request is already ${withdrawalReq.status}` });
    }

    let finalProofUrl = '';
    if (adminPayoutScreenshotUrl) {
      finalProofUrl = await uploadImageToCloudinary(adminPayoutScreenshotUrl, 'baazi_payout_proofs');
    }

    withdrawalReq.status = 'APPROVED';
    withdrawalReq.adminPayoutScreenshotUrl = finalProofUrl;
    withdrawalReq.adminPayoutUtr = adminPayoutUtr || 'PAYOUT_REF_' + Date.now();
    withdrawalReq.adminNote = adminNote || 'Payout Transferred & Verified';
    withdrawalReq.processedAt = new Date();
    await withdrawalReq.save();

    await WalletTransaction.create({
      userId: withdrawalReq.userId.toString(),
      userEmail: withdrawalReq.userEmail,
      type: 'WITHDRAWAL_APPROVED',
      amount: withdrawalReq.amount,
      balanceAfter: 0, // Recorded in ledger
      referenceId: withdrawalReq._id.toString(),
      description: `Withdrawal Payout Processed (Ref: ${withdrawalReq.adminPayoutUtr})`,
      proofScreenshotUrl: finalProofUrl,
    });

    return res.json({
      success: true,
      message: `Withdrawal payout of ₹${withdrawalReq.amount} APPROVED and marked completed!`,
      withdrawalRequest: withdrawalReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Withdrawal approval failed' });
  }
};

// @desc    Reject Withdrawal Request & Refund Balance to User Wallet
// @route   POST /api/admin/withdrawals/reject
export const rejectWithdrawal = async (req: Request, res: Response) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId) return res.status(400).json({ success: false, message: 'Withdrawal Request ID is required' });

    const withdrawalReq = await WithdrawalRequest.findById(requestId);
    if (!withdrawalReq) return res.status(404).json({ success: false, message: 'Withdrawal request not found' });

    if (withdrawalReq.status !== 'PENDING' && withdrawalReq.status !== 'PROCESSING') {
      return res.status(400).json({ success: false, message: `Withdrawal request is already ${withdrawalReq.status}` });
    }

    const user = await User.findById(withdrawalReq.userId);
    if (user) {
      user.walletBalance = Math.round(((user.walletBalance || 0) + withdrawalReq.amount) * 100) / 100;
      await user.save();

      await WalletTransaction.create({
        userId: user._id.toString(),
        userEmail: user.email,
        type: 'WITHDRAWAL_REJECTED',
        amount: withdrawalReq.amount,
        balanceAfter: user.walletBalance,
        referenceId: withdrawalReq._id.toString(),
        description: `Withdrawal Rejected & Refunded (+₹${withdrawalReq.amount})`,
      });
    }

    withdrawalReq.status = 'REJECTED';
    withdrawalReq.rejectionReason = reason || 'UPI / Bank Payout Details Invalid';
    withdrawalReq.processedAt = new Date();
    await withdrawalReq.save();

    return res.json({
      success: true,
      message: `Withdrawal REJECTED & ₹${withdrawalReq.amount} refunded to user wallet`,
      withdrawalRequest: withdrawalReq,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Withdrawal rejection failed' });
  }
};

export const getOrCreateAdminSettings = async () => {
  let settings = await AdminSettings.findOne({});
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

// @desc    Get Admin Config Settings
// @route   GET /api/admin/config
export const getAdminConfig = async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateAdminSettings();
    return res.json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch settings' });
  }
};

// @desc    Update Admin Config Settings
// @route   POST /api/admin/config
export const updateAdminConfig = async (req: Request, res: Response) => {
  try {
    const {
      qrCodeUrl,
      upiId,
      upiHolderName,
      bankName,
      accountNumber,
      ifscCode,
      minDeposit,
      minWithdrawal,
      adminPasscode,
      isQrEnabled,
      isBankEnabled,
    } = req.body;

    let settings = await AdminSettings.findOne({});
    if (!settings) {
      settings = new AdminSettings();
    }

    if (qrCodeUrl !== undefined && qrCodeUrl.trim() !== '') {
      if (qrCodeUrl.startsWith('data:image')) {
        settings.qrCodeUrl = await uploadImageToCloudinary(qrCodeUrl, 'baazi_admin_qr');
      } else {
        settings.qrCodeUrl = qrCodeUrl;
      }
    }
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

    return res.json({ success: true, message: 'Admin QR & UPI settings updated successfully!', settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update settings' });
  }
};

// @desc    Get Admin System Stats & Financial Audit Overview
// @route   GET /api/admin/stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const deposits = await DepositRequest.find({ status: 'APPROVED' });
    const withdrawals = await WithdrawalRequest.find({ status: 'APPROVED' });
    const pendingWithdrawals = await WithdrawalRequest.find({ status: 'PENDING' });
    const pendingDeposits = await DepositRequest.find({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } });

    const totalRealDeposits = deposits.reduce((sum, d) => sum + (d.approvedAmount || d.amount), 0);
    const totalRealWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const gameLogs = await GameLog.find({ playMode: 'REAL' });
    const totalAdminCommission = gameLogs.reduce((sum, g) => sum + (g.adminCommission || 0), 0);

    // Dynamically calculate online users (updated within last 15 mins) & active game matches
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const onlineUsersCount = await User.countDocuments({ updatedAt: { $gte: fifteenMinsAgo } });
    const activeGamesCount = await GameLog.countDocuments({ createdAt: { $gte: fifteenMinsAgo } });

    const now = Date.now();
    const slaBreachesCount = pendingWithdrawals.filter((w) => new Date(w.slaDeadline).getTime() < now).length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        onlineUsersCount: Math.max(1, onlineUsersCount),
        activeGamesCount,
        totalRealDeposits,
        totalRealWithdrawals,
        pendingWithdrawalAmount,
        totalAdminCommission,
        pendingCount: pendingDeposits.length,
        pendingWithdrawalsCount: pendingWithdrawals.length,
        slaBreachesCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch admin stats' });
  }
};

// @desc    Get All Users List
// @route   GET /api/admin/users
export const getAdminUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-otp -otpExpires').sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch users' });
  }
};

// @desc    Adjust User Balance (STRICT RULE: Direct Real Money addition disabled; requires verified deposit request)
// @route   POST /api/admin/users/adjust-balance
export const adminAdjustBalance = async (req: Request, res: Response) => {
  try {
    const { userId, type, delta } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const cleanDelta = Number(delta);

    if (type === 'REAL') {
      if (cleanDelta > 0) {
        return res.status(400).json({
          success: false,
          message:
            'Direct manual credit of real cash is disabled for security & audit transparency. All wallet credits MUST originate from an approved user deposit request.',
        });
      }

      // Allow negative balance correction/deduction if needed
      user.walletBalance = Math.max(0, Math.round(((user.walletBalance || 0) + cleanDelta) * 100) / 100);
      await WalletTransaction.create({
        userId: user._id.toString(),
        userEmail: user.email,
        type: 'ADMIN_ADJUST',
        amount: cleanDelta,
        balanceAfter: user.walletBalance,
        description: `Admin Manual Balance Correction (${cleanDelta})`,
      });
    } else {
      user.demoBalance = Math.max(0, (user.demoBalance || 0) + cleanDelta);
    }

    await user.save();
    return res.json({ success: true, message: `Adjusted balance by ${cleanDelta}`, user });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Adjustment failed' });
  }
};

// @desc    Get All Game Logs (Real & Demo)
// @route   GET /api/admin/game-logs
export const getAdminGameLogs = async (req: Request, res: Response) => {
  try {
    const logs = await GameLog.find().sort({ playedAt: -1 }).limit(100);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch game logs' });
  }
};
