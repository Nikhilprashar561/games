import mongoose, { Document, Schema } from 'mongoose';

export interface IGameLog extends Document {
  userId: string;
  userEmail: string;
  userName: string;
  gameSlug: string;
  gameTitle: string;
  playMode: 'REAL' | 'DEMO';
  entryFee: number;                  // Entry fee paid by player (e.g. ₹10)
  walletBalanceBefore: number;       // Balance before match
  walletBalanceAfter: number;        // Balance after match settlement
  result: 'WIN' | 'LOSS' | 'DRAW';
  matchOutcome: 'NORMAL_FINISH' | 'PLAYER_QUIT' | 'TIMEOUT';
  quitPlayerId?: string;             // Player ID who quit/forfeited if applicable
  amountWon: number;                 // Payout received by player on WIN (e.g. ₹18)
  amountLost: number;                // Entry fee lost on LOSS/QUIT (e.g. ₹10)
  adminCommission: number;           // Commission kept by admin (e.g. ₹2)
  winnerPayoutShare: number;         // Share awarded to winner
  netAmount: number;                 // Player Net earnings (amountWon - entryFee)
  opponentName: string;
  matchDurationSeconds?: number;
  playedAt: Date;
}

const GameLogSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: 'Gamer',
  },
  gameSlug: {
    type: String,
    required: true,
    index: true,
  },
  gameTitle: {
    type: String,
    required: true,
  },
  playMode: {
    type: String,
    enum: ['REAL', 'DEMO'],
    default: 'REAL',
  },
  entryFee: {
    type: Number,
    default: 10,
  },
  walletBalanceBefore: {
    type: Number,
    default: 0,
  },
  walletBalanceAfter: {
    type: Number,
    default: 0,
  },
  result: {
    type: String,
    enum: ['WIN', 'LOSS', 'DRAW'],
    required: true,
  },
  matchOutcome: {
    type: String,
    enum: ['NORMAL_FINISH', 'PLAYER_QUIT', 'TIMEOUT'],
    default: 'NORMAL_FINISH',
  },
  quitPlayerId: {
    type: String,
    default: '',
  },
  amountWon: {
    type: Number,
    default: 0,
  },
  amountLost: {
    type: Number,
    default: 0,
  },
  adminCommission: {
    type: Number,
    default: 0,
  },
  winnerPayoutShare: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    default: 0,
  },
  opponentName: {
    type: String,
    default: 'Online Player',
  },
  matchDurationSeconds: {
    type: Number,
    default: 0,
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IGameLog>('GameLog', GameLogSchema);
