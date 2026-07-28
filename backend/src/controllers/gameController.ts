import { Response } from 'express';
import GameLog from '../models/GameLog';
import { AuthRequest } from '../middleware/authMiddleware';

const fallbackLogs: any[] = [];

export const logGameMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { gameSlug, gameTitle, result, amountSpent, amountWon, opponentName } = req.body;

    if (!req.user || !gameSlug || !result) {
      return res.status(400).json({ message: 'Missing required match data' });
    }

    const netAmount = (amountWon || 0) - (amountSpent || 0);

    try {
      const log = await GameLog.create({
        userId: req.user.id,
        userEmail: req.user.email,
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        result,
        amountSpent: amountSpent || 0,
        amountWon: amountWon || 0,
        netAmount,
        opponentName: opponentName || 'Online Player',
      });

      return res.status(201).json({ success: true, log });
    } catch (dbErr) {
      const mockLog = {
        id: 'log_' + Date.now(),
        userId: req.user.id,
        userEmail: req.user.email,
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        result,
        amountSpent: amountSpent || 0,
        amountWon: amountWon || 0,
        netAmount,
        opponentName: opponentName || 'Online Player',
        playedAt: new Date(),
      };
      fallbackLogs.unshift(mockLog);
      return res.status(201).json({ success: true, log: mockLog });
    }
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getGameHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
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
      const totalSpent = logs.reduce((sum, l) => sum + (l.amountSpent || 0), 0);
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
      const totalSpent = userLogs.reduce((sum, l) => sum + (l.amountSpent || 0), 0);
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
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
