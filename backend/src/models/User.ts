import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  walletBalance: number; // Real Money Balance in ₹ Rupees
  upiId: string;
  avatar: string;
  isVerified: boolean;
  otp?: string;
  otpExpires?: Date;
  pendingEmail?: string;
  pendingEmailOtp?: string;
  pendingEmailOtpExpires?: Date;
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
    default: 500, // ₹500 Default real money wallet balance
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>('User', UserSchema);
