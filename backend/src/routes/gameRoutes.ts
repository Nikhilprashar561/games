import express from 'express';
import { logGameMatch, getGameHistory } from '../controllers/gameController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/log', protect, logGameMatch);
router.get('/history', protect, getGameHistory);

export default router;
