import express from 'express';
import { settleGameMatch, getGameHistory } from '../controllers/gameController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/settle-match', protect, settleGameMatch);
router.post('/log', protect, settleGameMatch);
router.get('/history', protect, getGameHistory);

export default router;
