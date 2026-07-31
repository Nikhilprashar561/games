import mongoose, { Document, Schema } from 'mongoose';

export interface IDepositRequest extends Document {
  userId: mongoose.Types.ObjectId | string;
  userEmail: string;
  userName: string;
  amount: number;                     // Requested deposit amount
  approvedAmount?: number;            // Final approved & credited amount
  utr: string;                        // UTR / Transaction ID
  type: 'DEPOSIT' | 'WITHDRAWAL';
  paymentMethod: string;
  upiOrBankDetails?: string;
  paymentScreenshotUrl?: string;     // User payment screenshot
  paymentTime?: Date;                // Time user completed payment
  adminProofScreenshotUrl?: string;  // Admin verification proof
  adminNote?: string;                // Admin internal note
  remarks?: string;                  // External remarks
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;               // Admin who approved
  approvalTime?: Date;               // Approval timestamp
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
  approvedAmount: {
    type: Number,
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
  remarks: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  approvedBy: {
    type: String,
    default: '',
  },
  approvalTime: {
    type: Date,
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
