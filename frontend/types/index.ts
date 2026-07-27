export interface User {
  id: string;
  name: string;
  email: string;
  coins: number;
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
}
