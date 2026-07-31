import express from 'express';
import {
  getPublicPaymentConfig,
  submitDepositUTR,
  submitWithdrawal,
  getMyDeposits,
  getMyWithdrawals,
  getMyTransactions,
  createOrder,
  verifyPayment,
} from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';
import { handleBankUPIWebhook } from '../controllers/webhookController';

const router = express.Router();

router.get('/config', getPublicPaymentConfig);
router.post('/deposit', protect, submitDepositUTR);
router.post('/withdraw', protect, submitWithdrawal);
router.get('/my-deposits', protect, getMyDeposits);
router.get('/my-withdrawals', protect, getMyWithdrawals);
router.get('/my-transactions', protect, getMyTransactions);
router.post('/webhook', handleBankUPIWebhook);

// Legacy direct order endpoints
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

export default router;
