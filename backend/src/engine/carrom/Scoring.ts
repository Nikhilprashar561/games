import { CoinType } from './Coin';

export interface CarromPlayerScore {
  id: string;
  name: string;
  assignedType: 'WHITE' | 'BLACK';
  score: number;
  fouls: number;
  pocketedCoins: number;
  hasQueen: boolean;
}

export class Scoring {
  public static calculateShotScore(
    player: CarromPlayerScore,
    pocketedTypes: CoinType[],
    isQueenCovered: boolean
  ): { pointsAdded: number; isFoul: boolean; extraTurn: boolean } {
    let pointsAdded = 0;
    let isFoul = false;
    let extraTurn = false;

    // Check Striker Foul
    if (pocketedTypes.includes('STRIKER')) {
      isFoul = true;
      pointsAdded -= 5;
    }

    // Process Pocketed Coins
    pocketedTypes.forEach((type) => {
      if (type === 'WHITE') {
        if (player.assignedType === 'WHITE') {
          pointsAdded += 10;
          extraTurn = true;
        } else {
          pointsAdded += 5; // Opponent coin
        }
      } else if (type === 'BLACK') {
        if (player.assignedType === 'BLACK') {
          pointsAdded += 10;
          extraTurn = true;
        } else {
          pointsAdded += 5;
        }
      } else if (type === 'QUEEN') {
        if (isQueenCovered) {
          pointsAdded += 30;
          player.hasQueen = true;
          extraTurn = true;
        }
      }
    });

    return { pointsAdded, isFoul, extraTurn };
  }
}
