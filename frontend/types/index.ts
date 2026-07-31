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
  matchOutcome?: 'NORMAL_FINISH' | 'PLAYER_QUIT' | 'TIMEOUT';
  quitPlayerId?: string;
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
  paymentScreenshotUrl?: string;
  paymentTime?: string;
  adminProofScreenshotUrl?: string;
  adminNote?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WithdrawalRequest {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  upiId: string;
  userQrCodeUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
  slaDeadline: string; // 4-Hour SLA deadline Date ISO string
  isSlaBreached?: boolean;
  msRemaining?: number;
  adminPayoutScreenshotUrl?: string;
  adminPayoutUtr?: string;
  rejectionReason?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  userEmail: string;
  type: 'DEPOSIT' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REJECTED' | 'GAME_ENTRY' | 'GAME_WIN' | 'ADMIN_ADJUST';
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  proofScreenshotUrl?: string;
  createdAt: string;
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
