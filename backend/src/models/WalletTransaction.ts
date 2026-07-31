import mongoose, { Document, Schema } from 'mongoose';

export interface IWalletTransaction extends Document {
  userId: string;
  userEmail: string;
  type: 'DEPOSIT' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REJECTED' | 'GAME_ENTRY' | 'GAME_WIN' | 'ADMIN_ADJUST';
  amount: number;         // Positive for credit (+), negative for debit (-)
  balanceAfter: number;   // Running real cash wallet balance
  referenceId?: string;   // Deposit ID, Withdrawal ID, or Game Log ID
  description: string;
  proofScreenshotUrl?: string;
  createdAt: Date;
}

const WalletTransactionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL_REQUEST', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'GAME_ENTRY', 'GAME_WIN', 'ADMIN_ADJUST'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  referenceId: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    required: true,
  },
  proofScreenshotUrl: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
