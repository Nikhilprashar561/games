import mongoose, { Document, Schema } from 'mongoose';

export interface IGameLog extends Document {
  userId: string;
  userEmail: string;
  gameSlug: string;
  gameTitle: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  amountSpent: number; // in ₹ Rupees
  amountWon: number;   // in ₹ Rupees
  netAmount: number;   // in ₹ Rupees
  opponentName: string;
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
  gameSlug: {
    type: String,
    required: true,
    index: true,
  },
  gameTitle: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    enum: ['WIN', 'LOSS', 'DRAW'],
    required: true,
  },
  amountSpent: {
    type: Number,
    default: 0,
  },
  amountWon: {
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
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IGameLog>('GameLog', GameLogSchema);
