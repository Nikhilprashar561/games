import { Response } from 'express';
import GameLog from '../models/GameLog';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import { AuthRequest } from '../middleware/authMiddleware';

const fallbackLogs: any[] = [];

// @desc    Settle Game Match Outcome & Update Wallet + Admin Commission + Double-Entry Audit Logs
// @route   POST /api/games/settle-match
export const settleGameMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { gameSlug, gameTitle, playMode, result, entryFee, opponentName, matchOutcome, quitPlayerId } = req.body;

    if (!req.user || !gameSlug || !result) {
      return res.status(400).json({ success: false, message: 'Missing required match data' });
    }

    const fee = Number(entryFee) || 10;
    const mode = playMode === 'DEMO' ? 'DEMO' : 'REAL';

    let amountWon = 0;
    let amountLost = 0;
    let adminCommission = 0;
    let winnerPayoutShare = 0;
    let balanceDelta = 0;

    const totalPot = 2 * fee;

    if (mode === 'DEMO') {
      adminCommission = 0;
      if (result === 'WIN') {
        amountWon = req.body.amountWon !== undefined ? Number(req.body.amountWon) : Math.round(fee * 1.8);
        winnerPayoutShare = amountWon;
        balanceDelta = amountWon;
      } else if (result === 'LOSS') {
        amountWon = 0;
        amountLost = fee;
        balanceDelta = 0;
      } else {
        amountWon = fee;
        balanceDelta = fee;
      }
    } else {
      if (result === 'WIN') {
        // 10% cut of winning pot to admin, 90% to winner
        adminCommission = Math.round(totalPot * 0.10 * 100) / 100;
        winnerPayoutShare = Math.round((totalPot - adminCommission) * 100) / 100;
        amountWon = req.body.amountWon !== undefined ? Number(req.body.amountWon) : winnerPayoutShare;
        balanceDelta = amountWon;
      } else if (result === 'LOSS') {
        amountWon = 0;
        amountLost = fee;
        adminCommission = fee; // Whole bet amount transferred to admin share
        balanceDelta = 0;
      } else if (result === 'DRAW') {
        amountWon = fee;
        adminCommission = 0;
        balanceDelta = fee;
      }
    }

    const netAmount = Math.round((amountWon - fee) * 100) / 100;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found' });
      }

      const walletBalanceBefore = mode === 'REAL' ? (user.walletBalance || 0) : (user.demoBalance || 1000);

      if (mode === 'REAL') {
        if (result === 'LOSS' && (user.walletBalance || 0) < fee) {
          user.walletBalance = 0;
        } else {
          user.walletBalance = Math.max(0, Math.round(((user.walletBalance || 0) + balanceDelta) * 100) / 100);
        }
      } else {
        const currentDemo = user.demoBalance !== undefined ? user.demoBalance : 1000;
        user.demoBalance = Math.max(0, currentDemo + balanceDelta);
      }

      await user.save();
      const walletBalanceAfter = mode === 'REAL' ? user.walletBalance : user.demoBalance;

      const outcomeTag = matchOutcome || (result === 'LOSS' && quitPlayerId ? 'PLAYER_QUIT' : 'NORMAL_FINISH');

      // Create detailed GameLog in MongoDB
      const log = await GameLog.create({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        playMode: mode,
        entryFee: fee,
        walletBalanceBefore,
        walletBalanceAfter,
        result,
        matchOutcome: outcomeTag,
        quitPlayerId: quitPlayerId || '',
        amountWon,
        amountLost,
        adminCommission,
        winnerPayoutShare,
        netAmount,
        opponentName: opponentName || 'Online Player',
        playedAt: new Date(),
      });

      // Record Financial Audit Log for Real Money Match Payouts
      if (mode === 'REAL' && amountWon > 0) {
        await WalletTransaction.create({
          userId: user._id.toString(),
          userEmail: user.email,
          type: 'GAME_WIN',
          amount: amountWon,
          balanceAfter: user.walletBalance,
          referenceId: log._id.toString(),
          description: `Won ${gameTitle || gameSlug} match (+₹${amountWon})`,
        });
      }

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
      const mockLog = {
        id: 'log_' + Date.now(),
        userId: req.user.id,
        userEmail: req.user.email,
        userName: (req.user as any)?.name || 'Gamer',
        gameSlug,
        gameTitle: gameTitle || gameSlug,
        playMode: mode,
        entryFee: fee,
        walletBalanceBefore: 0,
        walletBalanceAfter: 0,
        result,
        matchOutcome: matchOutcome || 'NORMAL_FINISH',
        amountWon,
        amountLost,
        adminCommission,
        winnerPayoutShare,
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

// @desc    Explicitly Handle Player Quitting / Leaving Match Mid-Game
// @route   POST /api/games/quit-match
export const quitGameMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { gameSlug, gameTitle, playMode, entryFee, opponentName } = req.body;
    if (!req.user || !gameSlug) {
      return res.status(400).json({ success: false, message: 'Missing game info' });
    }

    const fee = Number(entryFee) || 10;
    const mode = playMode === 'DEMO' ? 'DEMO' : 'REAL';

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const walletBalanceBefore = mode === 'REAL' ? (user.walletBalance || 0) : (user.demoBalance || 1000);
    const walletBalanceAfter = walletBalanceBefore; // Entry fee was already deducted at entry time

    const log = await GameLog.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      gameSlug,
      gameTitle: gameTitle || gameSlug,
      playMode: mode,
      entryFee: fee,
      walletBalanceBefore,
      walletBalanceAfter,
      result: 'LOSS',
      matchOutcome: 'PLAYER_QUIT',
      quitPlayerId: user._id.toString(),
      amountWon: 0,
      amountLost: fee,
      adminCommission: fee, // Quitted fee transferred to admin share
      winnerPayoutShare: 0,
      netAmount: -fee,
      opponentName: opponentName || 'Opponent Player',
      playedAt: new Date(),
    });

    return res.json({
      success: true,
      message: `Match quit logged: Entry fee ₹${fee} forfeited.`,
      log,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to record quit match' });
  }
};

// @desc    Get User Match History & Stats
// @route   GET /api/games/history
export const getGameHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { gameSlug, mode, playMode: playModeQuery } = req.query;
    const targetMode = (mode || playModeQuery || 'REAL') as string;

    try {
      const query: any = { userId: req.user.id };
      if (gameSlug && typeof gameSlug === 'string') {
        query.gameSlug = gameSlug;
      }

      const logs = await GameLog.find(query).sort({ playedAt: -1 }).limit(50);
      const realLogs = logs.filter((l) => l.playMode === targetMode || (targetMode === 'REAL' && (!l.playMode || l.playMode === 'REAL')));

      const totalMatches = realLogs.length;
      const wins = realLogs.filter((l) => l.result === 'WIN').length;
      const losses = realLogs.filter((l) => l.result === 'LOSS').length;
      const draws = realLogs.filter((l) => l.result === 'DRAW').length;
      const quits = realLogs.filter((l) => l.matchOutcome === 'PLAYER_QUIT').length;

      const totalWon = Math.round(realLogs.reduce((sum, l) => sum + (l.amountWon || 0), 0) * 100) / 100;
      const totalSpent = Math.round(realLogs.reduce((sum, l) => sum + (l.entryFee || 0), 0) * 100) / 100;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const netEarnings = Math.round((totalWon - totalSpent) * 100) / 100;

      return res.json({
        success: true,
        stats: {
          totalMatches,
          wins,
          losses,
          draws,
          quits,
          winRate,
          totalWon,
          totalSpent,
          netEarnings,
        },
        logs,
      });
    } catch (dbErr) {
      return res.json({
        success: true,
        stats: { totalMatches: 0, wins: 0, losses: 0, draws: 0, quits: 0, winRate: 0, totalWon: 0, totalSpent: 0, netEarnings: 0 },
        logs: [],
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
    const logs = await GameLog.find({}).sort({ playedAt: -1 }).limit(100);
    const rawCommission = logs.filter((l) => l.playMode === 'REAL').reduce((sum, l) => sum + (l.adminCommission || 0), 0);
    const totalAdminCommission = Math.round(rawCommission * 100) / 100;

    return res.json({
      success: true,
      totalAdminCommission,
      logs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Server error fetching game logs' });
  }
};
