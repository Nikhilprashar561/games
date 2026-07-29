import express from 'express';
import {
  adminLogin,
  getDeposits,
  approveDeposit,
  rejectDeposit,
  getAdminConfig,
  updateAdminConfig,
  getAdminStats,
  getAllUsers,
  adjustUserBalance,
  createTestDeposit,
  resetAllUserWallets,
} from '../controllers/adminController';
import { getAllGameLogs } from '../controllers/gameController';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/deposits', getDeposits);
router.post('/deposits/approve', approveDeposit);
router.post('/deposits/reject', rejectDeposit);
router.post('/deposits/create-test', createTestDeposit);
router.get('/config', getAdminConfig);
router.post('/config', updateAdminConfig);
router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.get('/game-logs', getAllGameLogs);
router.post('/users/adjust-balance', adjustUserBalance);
router.post('/users/reset-all-wallets', resetAllUserWallets);

export default router;
