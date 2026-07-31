export type CoinType = 'WHITE' | 'BLACK' | 'QUEEN' | 'STRIKER';

export interface CarromCoin {
  id: string;
  type: CoinType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPocketed: boolean;
  points: number; // White=10, Black=5, Queen=30
}

export class CoinFactory {
  public static createInitialCoins(boardSize: number = 600): CarromCoin[] {
    const cx = boardSize / 2;
    const cy = boardSize / 2;
    const coins: CarromCoin[] = [];

    // Red Queen in exact center
    coins.push({
      id: 'queen',
      type: 'QUEEN',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      isPocketed: false,
      points: 30,
    });

    // Ring 1 (6 coins around Queen: alternating White & Black)
    const ring1Radius = 24;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const type: CoinType = i % 2 === 0 ? 'WHITE' : 'BLACK';
      coins.push({
        id: `r1_${i}`,
        type,
        x: cx + Math.cos(angle) * ring1Radius,
        y: cy + Math.sin(angle) * ring1Radius,
        vx: 0,
        vy: 0,
        isPocketed: false,
        points: type === 'WHITE' ? 10 : 5,
      });
    }

    // Ring 2 (12 coins around Ring 1)
    const ring2Radius = 48;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const type: CoinType = i % 2 === 0 ? 'WHITE' : 'BLACK';
      coins.push({
        id: `r2_${i}`,
        type,
        x: cx + Math.cos(angle) * ring2Radius,
        y: cy + Math.sin(angle) * ring2Radius,
        vx: 0,
        vy: 0,
        isPocketed: false,
        points: type === 'WHITE' ? 10 : 5,
      });
    }

    // Striker at bottom baseline
    coins.push({
      id: 'striker',
      type: 'STRIKER',
      x: cx,
      y: boardSize * 0.82,
      vx: 0,
      vy: 0,
      isPocketed: false,
      points: 0,
    });

    return coins;
  }
}
