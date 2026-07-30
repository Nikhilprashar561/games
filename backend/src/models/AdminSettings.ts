import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminSettings extends Document {
  qrCodeUrl: string;
  upiId: string;
  upiHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  minDeposit: number;
  minWithdrawal: number;
  adminPasscode: string;
  isQrEnabled: boolean;
  isBankEnabled: boolean;
  updatedAt: Date;
}

const AdminSettingsSchema: Schema = new Schema({
  qrCodeUrl: {
    type: String,
    default: '/images/payment_qr.svg',
  },
  upiId: {
    type: String,
    default: '',
  },
  upiHolderName: {
    type: String,
    default: 'Baazi Board Arena Official',
  },
  bankName: {
    type: String,
    default: '',
  },
  accountNumber: {
    type: String,
    default: '',
  },
  ifscCode: {
    type: String,
    default: '',
  },
  minDeposit: {
    type: Number,
    default: 100,
  },
  minWithdrawal: {
    type: Number,
    default: 200,
  },
  adminPasscode: {
    type: String,
    default: 'admin123',
  },
  isQrEnabled: {
    type: Boolean,
    default: true,
  },
  isBankEnabled: {
    type: Boolean,
    default: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);
