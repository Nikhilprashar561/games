import express from 'express';
import {
  verifyAdminPasscode,
  getDeposits,
  getWithdrawals,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
  getAdminConfig,
  updateAdminConfig,
  getAdminStats,
  getAdminUsers,
  adminAdjustBalance,
  getAdminGameLogs,
} from '../controllers/adminController';

const router = express.Router();

router.post('/login', verifyAdminPasscode);

// Deposit Routes
router.get('/deposits', getDeposits);
router.post('/deposits/approve', approveDeposit);
router.post('/deposits/reject', rejectDeposit);

// Withdrawal Routes (4-Hour SLA Payouts)
router.get('/withdrawals', getWithdrawals);
router.post('/withdrawals/approve', approveWithdrawal);
router.post('/withdrawals/reject', rejectWithdrawal);

// Configuration & Stats Routes
router.get('/config', getAdminConfig);
router.post('/config', updateAdminConfig);
router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/game-logs', getAdminGameLogs);
router.post('/users/adjust-balance', adminAdjustBalance);

export default router;
