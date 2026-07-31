import { CarromCoin, CoinFactory, CoinType } from './Coin';
import { CarromPlayerScore, Scoring } from './Scoring';

export class CarromEngine {
  public roomId: string;
  public entryFee: number;
  public coins: CarromCoin[] = [];
  public players: CarromPlayerScore[] = [];
  public currentTurnIndex: number = 0;
  public isGameActive: boolean = false;
  public winnerId?: string;
  public pendingQueenCover: boolean = false;
  public queenPendingPlayerId?: string;

  constructor(roomId: string, entryFee: number = 25) {
    this.roomId = roomId;
    this.entryFee = entryFee;
  }

  public addPlayer(id: string, name: string): boolean {
    if (this.players.length >= 2 || this.isGameActive) return false;
    const assignedType: 'WHITE' | 'BLACK' = this.players.length === 0 ? 'WHITE' : 'BLACK';
    this.players.push({
      id,
      name,
      assignedType,
      score: 0,
      fouls: 0,
      pocketedCoins: 0,
      hasQueen: false,
    });
    return true;
  }

  public startMatch(): boolean {
    if (this.players.length < 2) return false;
    this.coins = CoinFactory.createInitialCoins(600);
    this.isGameActive = true;
    this.winnerId = undefined;
    this.currentTurnIndex = 0;
    this.pendingQueenCover = false;
    this.queenPendingPlayerId = undefined;

    this.players.forEach((p) => {
      p.score = 0;
      p.fouls = 0;
      p.pocketedCoins = 0;
      p.hasQueen = false;
    });

    return true;
  }

  public processShotResult(
    playerId: string,
    pocketedTypes: CoinType[],
    updatedCoinPositions: { id: string; x: number; y: number }[]
  ): { nextTurnId: string; winnerId?: string } {
    const activePlayer = this.players[this.currentTurnIndex];
    if (!activePlayer || activePlayer.id !== playerId || !this.isGameActive) {
      return { nextTurnId: this.players[this.currentTurnIndex]?.id || '' };
    }

    // Sync updated coin positions
    updatedCoinPositions.forEach((pos) => {
      const coin = this.coins.find((c) => c.id === pos.id);
      if (coin) {
        coin.x = pos.x;
        coin.y = pos.y;
      }
    });

    // Mark pocketed coins
    pocketedTypes.forEach((type) => {
      const coin = this.coins.find((c) => c.type === type && !c.isPocketed);
      if (coin) {
        coin.isPocketed = true;
      }
    });

    // Handle Queen cover logic
    let queenCoveredNow = false;
    if (this.pendingQueenCover && this.queenPendingPlayerId === playerId) {
      const pocketedOwn = pocketedTypes.some((t) => t === activePlayer.assignedType);
      if (pocketedOwn) {
        queenCoveredNow = true;
        this.pendingQueenCover = false;
        this.queenPendingPlayerId = undefined;
      } else {
        // Return Queen to board center (Rosette)
        const queen = this.coins.find((c) => c.type === 'QUEEN');
        if (queen) {
          queen.isPocketed = false;
          queen.x = 300;
          queen.y = 300;
        }
        this.pendingQueenCover = false;
        this.queenPendingPlayerId = undefined;
      }
    }

    if (pocketedTypes.includes('QUEEN') && !queenCoveredNow) {
      this.pendingQueenCover = true;
      this.queenPendingPlayerId = playerId;
    }

    const { pointsAdded, isFoul, extraTurn } = Scoring.calculateShotScore(
      activePlayer,
      pocketedTypes,
      queenCoveredNow
    );

    activePlayer.score = Math.max(0, activePlayer.score + pointsAdded);
    if (isFoul) activePlayer.fouls += 1;

    // Reset Striker to baseline
    const striker = this.coins.find((c) => c.type === 'STRIKER');
    if (striker) {
      striker.isPocketed = false;
      striker.x = 300;
      striker.y = 492;
      striker.vx = 0;
      striker.vy = 0;
    }

    // Check Win Condition: All White/Black coins pocketed
    const activeAssignedLeft = this.coins.filter(
      (c) => c.type === activePlayer.assignedType && !c.isPocketed
    ).length;

    if (activeAssignedLeft === 0) {
      this.isGameActive = false;
      this.winnerId = activePlayer.id;
      return { nextTurnId: activePlayer.id, winnerId: activePlayer.id };
    }

    if (!extraTurn && !queenCoveredNow) {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    }

    return { nextTurnId: this.players[this.currentTurnIndex].id };
  }
}
