export interface User {
  id: string;
  name: string;
  email: string;
  walletBalance: number; // Real Money Balance in ₹ Rupees
  upiId: string;
  avatar: string;
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
