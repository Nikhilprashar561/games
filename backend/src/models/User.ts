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
  withdrawalPin?: string; // 4-Digit Withdrawal Security PIN
  referralCode?: string; // Unique referral code (e.g. BAAZI-X92F)
  referredBy?: string; // Referrer user ID if signed up via referral link
  referralEarnings?: number; // Total referral earnings in ₹
  googleId?: string;
  isGoogleVerified?: boolean;
  lastLoginAt?: Date;
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
    default: 0,
  },
  demoBalance: {
    type: Number,
    default: 1000,
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
  withdrawalPin: {
    type: String,
    default: '',
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: String,
    default: '',
  },
  referralEarnings: {
    type: Number,
    default: 0,
  },
  googleId: {
    type: String,
    default: null,
  },
  isGoogleVerified: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
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
