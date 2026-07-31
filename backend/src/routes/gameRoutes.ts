import express from 'express';
import { settleGameMatch, quitGameMatch, getGameHistory } from '../controllers/gameController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/settle-match', protect, settleGameMatch);
router.post('/quit-match', protect, quitGameMatch);
router.post('/log', protect, settleGameMatch);
router.get('/history', protect, getGameHistory);

export default router;
