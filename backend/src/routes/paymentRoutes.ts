import express from 'express';
import {
  getPublicPaymentConfig,
  submitDepositUTR,
  submitWithdrawal,
  getMyDeposits,
  createOrder,
  verifyPayment,
} from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/config', getPublicPaymentConfig);
router.post('/deposit', protect, submitDepositUTR);
router.post('/withdraw', protect, submitWithdrawal);
router.get('/my-deposits', protect, getMyDeposits);

// Legacy direct order endpoints
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

export default router;
