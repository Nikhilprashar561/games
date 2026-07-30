import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  walletBalance: number; // Real Money Balance in ₹ Rupees
  demoBalance: number; // Demo Money Coins for Practice Play
  role: 'user' | 'admin';
  upiId: string;
  avatar: string;
  isVerified: boolean;
  otp?: string;
  otpExpires?: Date;
  pendingEmail?: string;
  pendingEmailOtp?: string;
  pendingEmailOtpExpires?: Date;
  hasClaimedSignupBonus: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  walletBalance: {
    type: Number,
    default: 0, // Default real money balance
  },
  demoBalance: {
    type: Number,
    default: 1000, // 1,000 Demo Coins on Registration
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  upiId: {
    type: String,
    default: 'user@paytm',
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gamer',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  pendingEmail: {
    type: String,
    default: null,
  },
  pendingEmailOtp: {
    type: String,
    default: null,
  },
  pendingEmailOtpExpires: {
    type: Date,
    default: null,
  },
  hasClaimedSignupBonus: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>('User', UserSchema);
