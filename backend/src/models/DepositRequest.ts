import mongoose, { Document, Schema } from 'mongoose';

export interface IDepositRequest extends Document {
  userId: mongoose.Types.ObjectId | string;
  userEmail: string;
  userName: string;
  amount: number;
  utr: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  paymentMethod: string;
  upiOrBankDetails?: string;
  paymentScreenshotUrl?: string;     // User payment screenshot (Cloudinary/Base64)
  paymentTime?: Date;                // Time user completed payment
  adminProofScreenshotUrl?: string; // Admin verification proof
  adminNote?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: Date;
  processedAt?: Date;
}

const DepositRequestSchema: Schema = new Schema({
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
  utr: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL'],
    default: 'DEPOSIT',
  },
  paymentMethod: {
    type: String,
    default: 'UPI_QR',
  },
  upiOrBankDetails: {
    type: String,
    default: '',
  },
  paymentScreenshotUrl: {
    type: String,
    default: '',
  },
  paymentTime: {
    type: Date,
    default: Date.now,
  },
  adminProofScreenshotUrl: {
    type: String,
    default: '',
  },
  adminNote: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  rejectionReason: {
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

export default mongoose.model<IDepositRequest>('DepositRequest', DepositRequestSchema);
