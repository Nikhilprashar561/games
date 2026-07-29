import { Response } from 'express';
import GameLog from '../models/GameLog';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const fallbackLogs: any[] = [];

// @desc    Settle Game Match Outcome & Update Wallet + Admin Commission
// @route   POST /api/games/settle-match
export const settleGameMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { gameSlug, gameTitle, playMode, result, entryFee, opponentName } = req.body;

    if (!req.user || !gameSlug || !result) {
      return res.status(400).json({ success: false, message: 'Missing required match data' });
    }

    const fee = Number(entryFee) || 10;
    const mode = playMode === 'DEMO' ? 'DEMO' : 'REAL';

    let amountWon = 0;
    let adminCommission = 0;
    let balanceDelta = 0;

    const totalPot = 2 * fee;

    if (result === 'WIN') {
      // 12% cut of the winning pot to admin, 88% to winner
      adminCommission = Math.round(totalPot * 0.12 * 100) / 100;
      amountWon = req.body.amountWon !== undefined ? Number(req.body.amountWon) : Math.round((totalPot - adminCommission) * 100) / 100;
      balanceDelta = amountWon - fee; // Net profit
    } else if (result === 'LOSS') {
      amountWon = 0;
      adminCommission = fee; // Whole bet amount goes to admin
      balanceDelta = -fee; // Net loss
    } else if (result === 'DRAW') {
      amountWon = fee; // Entry fee refunded
      adminCommission = 0;
      balanceDelta = 0; // Net zero
    }

    const netAmount = amountWon - fee;

    try {
      // Find and update user balance in MongoDB
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found' });
      }

      if (mode === 'REAL') {
        // Ensure user has sufficient balance before settling
        if (result === 'LOSS' && (user.walletBalance || 0) < fee) {
          user.walletBalance = 0;
        } else {
          user.walletBalance = Math.max(0, (user.walletBalance || 0) + balanceDelta);
        }
      } else {
        const currentDemo = user.demoBalance !== undefined ? user.demoBalance : 10000;
        user.demoBalance = Math.max(0, currentDemo + balanceDelta);
      }

      await user.save();

      // Create detailed GameLog in MongoDB
      const log = await GameLog.create({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        playMode: mode,
        entryFee: fee,
        result,
        amountWon,
        adminCommission,
        netAmount,
        opponentName: opponentName || 'Online Player',
        playedAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: `Match settled: ${result}! ${mode === 'REAL' ? `₹${amountWon}` : `${amountWon} Coins`} awarded.`,
        log,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance,
          demoBalance: user.demoBalance,
        },
      });
    } catch (dbErr) {
      // In-memory fallback if MongoDB connection is offline
      const mockLog = {
        id: 'log_' + Date.now(),
        userId: req.user.id,
        userEmail: req.user.email,
        userName: (req.user as any)?.name || 'Gamer',
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        playMode: mode,
        entryFee: fee,
        result,
        amountWon,
        adminCommission,
        netAmount,
        opponentName: opponentName || 'Online Player',
        playedAt: new Date(),
      };
      fallbackLogs.unshift(mockLog);

      return res.status(201).json({
        success: true,
        message: `Match settled: ${result}!`,
        log: mockLog,
      });
    }
  } catch (error: any) {
    console.error('Settle Match Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error settling match' });
  }
};

// @desc    Get User Match History & Stats
// @route   GET /api/games/history
export const getGameHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { gameSlug } = req.query;

    try {
      const query: any = { userId: req.user.id };
      if (gameSlug && typeof gameSlug === 'string') {
        query.gameSlug = gameSlug;
      }

      const logs = await GameLog.find(query).sort({ playedAt: -1 }).limit(50);
      
      const totalMatches = logs.length;
      const wins = logs.filter((l) => l.result === 'WIN').length;
      const losses = logs.filter((l) => l.result === 'LOSS').length;
      const draws = logs.filter((l) => l.result === 'DRAW').length;
      const totalWon = logs.reduce((sum, l) => sum + (l.amountWon || 0), 0);
      const totalSpent = logs.reduce((sum, l) => sum + (l.entryFee || 0), 0);
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      return res.json({
        success: true,
        stats: {
          totalMatches,
          wins,
          losses,
          draws,
          winRate,
          totalWon,
          totalSpent,
          netEarnings: totalWon - totalSpent,
        },
        logs,
      });
    } catch (dbErr) {
      const userLogs = fallbackLogs.filter(
        (l) => l.userId === req.user?.id && (!gameSlug || l.gameSlug === gameSlug)
      );

      const totalMatches = userLogs.length;
      const wins = userLogs.filter((l) => l.result === 'WIN').length;
      const losses = userLogs.filter((l) => l.result === 'LOSS').length;
      const draws = userLogs.filter((l) => l.result === 'DRAW').length;
      const totalWon = userLogs.reduce((sum, l) => sum + (l.amountWon || 0), 0);
      const totalSpent = userLogs.reduce((sum, l) => sum + (l.entryFee || 0), 0);
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      return res.json({
        success: true,
        stats: {
          totalMatches,
          wins,
          losses,
          draws,
          winRate,
          totalWon,
          totalSpent,
          netEarnings: totalWon - totalSpent,
        },
        logs: userLogs,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get All Customer Betting Logs for Admin Dashboard
// @route   GET /api/admin/game-logs
export const getAllGameLogs = async (req: AuthRequest, res: Response) => {
  try {
    try {
      const logs = await GameLog.find({}).sort({ playedAt: -1 }).limit(100);
      const totalAdminCommission = logs.reduce((sum, l) => sum + (l.adminCommission || 0), 0);

      return res.json({
        success: true,
        totalAdminCommission,
        logs,
      });
    } catch (dbErr) {
      const totalAdminCommission = fallbackLogs.reduce((sum, l) => sum + (l.adminCommission || 0), 0);
      return res.json({
        success: true,
        totalAdminCommission,
        logs: fallbackLogs,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching game logs' });
  }
};
