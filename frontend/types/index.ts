export interface User {
  id: string;
  name: string;
  email: string;
  walletBalance: number; // Real Money Balance in ₹ Rupees
  demoBalance?: number; // Demo Money Coins for Practice Play
  role?: 'user' | 'admin';
  upiId: string;
  avatar: string;
  isVerified?: boolean;
}

export interface GameInfo {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  isProtected: boolean;
  category: string;
  playersCount: string;
  badge?: string;
  entryFee?: number;
  winReward?: number;
}

export interface GameMatchLog {
  id: string;
  userId: string;
  userEmail: string;
  gameSlug: string;
  gameTitle: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  amountSpent: number;
  amountWon: number;
  netAmount: number;
  opponentName: string;
  playedAt: string;
}

export interface GameStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalWon: number;
  totalSpent: number;
  netEarnings: number;
}

export interface DepositRequest {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  utr: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  paymentMethod: string;
  upiOrBankDetails?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AdminSettings {
  qrCodeUrl: string;
  upiId: string;
  upiHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  minDeposit: number;
  minWithdrawal: number;
  adminPasscode?: string;
  isQrEnabled?: boolean;
  isBankEnabled?: boolean;
}
