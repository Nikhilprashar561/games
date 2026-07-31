import mongoose, { Document, Schema } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  userId: mongoose.Types.ObjectId | string;
  userEmail: string;
  userName: string;
  amount: number;
  upiId: string;
  userQrCodeUrl?: string;           // Optional user QR code screenshot
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  slaDeadline: Date;                // createdAt + 4 Hours
  adminPayoutScreenshotUrl?: string; // Admin payout proof
  adminPayoutUtr?: string;          // Bank reference UTR
  rejectionReason?: string;
  adminNote?: string;
  createdAt: Date;
  processedAt?: Date;
}

const WithdrawalRequestSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  userName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Amount must be greater than 0'],
  },
  upiId: {
    type: String,
    required: true,
    trim: true,
  },
  userQrCodeUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  slaDeadline: {
    type: Date,
    required: true,
  },
  adminPayoutScreenshotUrl: {
    type: String,
    default: '',
  },
  adminPayoutUtr: {
    type: String,
    default: '',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  adminNote: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
  },
});

export default mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);
