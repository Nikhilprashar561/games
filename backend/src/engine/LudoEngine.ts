export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface TokenState {
  id: number; // 0..3
  color: PlayerColor;
  position: number; // -1 = Base, 0..51 = Outer Circuit, 100..105 = Home Stretch, 200 = Finished Home
  stepCount: number; // 0 = Base, 1 = Start Cell, 52 = Home Entrance, 57 = Home Victory
}

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  tokens: TokenState[];
  isAI: boolean;
}

// 52 Outer Track Map & Safe Cells (0-indexed circuit)
// Red Starts at 0, Green at 13, Yellow at 26, Blue at 39
export const START_CIRCUIT_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const SAFE_CIRCUIT_INDEXES = [0, 8, 13, 21, 26, 34, 39, 47];

export class LudoEngine {
  players: Map<PlayerColor, PlayerState>;
  turnOrder: PlayerColor[];
  currentTurnIndex: number;
  currentDice: number | null;
  consecutiveSixes: number;
  gameWinner: PlayerColor | null;
  logHistory: string[];

  constructor(playerData: { name: string; color: PlayerColor; isAI?: boolean }[]) {
    this.players = new Map();
    this.turnOrder = ['red', 'green', 'yellow', 'blue'];
    this.currentTurnIndex = 0;
    this.currentDice = null;
    this.consecutiveSixes = 0;
    this.gameWinner = null;
    this.logHistory = [];

    playerData.forEach((p) => {
      const tokens: TokenState[] = Array.from({ length: 4 }, (_, i) => ({
        id: i,
        color: p.color,
        position: -1, // In Base
        stepCount: 0,
      }));

      this.players.set(p.color, {
        id: p.name,
        name: p.name,
        color: p.color,
        tokens,
        isAI: !!p.isAI,
      });
    });
  }

  getCurrentPlayer(): PlayerState {
    return this.players.get(this.turnOrder[this.currentTurnIndex])!;
  }

  rollDice(): { dice: number; extraTurn: boolean; forfeitTurn: boolean } {
    const dice = Math.floor(Math.random() * 6) + 1;
    this.currentDice = dice;

    if (dice === 6) {
      this.consecutiveSixes += 1;
    } else {
      this.consecutiveSixes = 0;
    }

    // Three consecutive 6s rule -> forfeit turn
    if (this.consecutiveSixes >= 3) {
      this.consecutiveSixes = 0;
      this.currentDice = null;
      this.nextTurn();
      return { dice, extraTurn: false, forfeitTurn: true };
    }

    const hasMovable = this.getMovableTokens(this.getCurrentPlayer().color, dice).length > 0;
    if (!hasMovable && dice !== 6) {
      // No legal moves possible -> automatically switch turn
      setTimeout(() => this.nextTurn(), 500);
      return { dice, extraTurn: false, forfeitTurn: false };
    }

    return { dice, extraTurn: dice === 6, forfeitTurn: false };
  }

  getMovableTokens(color: PlayerColor, dice: number): TokenState[] {
    const player = this.players.get(color);
    if (!player) return [];

    return player.tokens.filter((token) => {
      // Base token can only be unlocked on rolling 6
      if (token.position === -1) {
        return dice === 6;
      }
      // Finished token cannot move
      if (token.position === 200) {
        return false;
      }
      // Check if step count exceeds exact Home Victory (step 57)
      return token.stepCount + dice <= 57;
    });
  }

  moveToken(color: PlayerColor, tokenId: number, dice: number): {
    success: boolean;
    captured: TokenState | null;
    reachedHome: boolean;
    extraTurn: boolean;
  } {
    const player = this.players.get(color);
    if (!player || this.currentDice !== dice) {
      return { success: false, captured: null, reachedHome: false, extraTurn: false };
    }

    const token = player.tokens.find((t) => t.id === tokenId);
    if (!token) {
      return { success: false, captured: null, reachedHome: false, extraTurn: false };
    }

    let capturedToken: TokenState | null = null;
    let reachedHome = false;
    let extraTurn = dice === 6;

    if (token.position === -1) {
      // Release token from Base to Start Cell
      if (dice !== 6) return { success: false, captured: null, reachedHome: false, extraTurn: false };
      token.position = START_CIRCUIT_INDEX[color];
      token.stepCount = 1;
      this.logHistory.unshift(`${player.name} released Token #${tokenId + 1} to track!`);
    } else {
      // Move token along circuit / home stretch
      const oldStep = token.stepCount;
      const newStep = oldStep + dice;
      token.stepCount = newStep;

      if (newStep === 57) {
        // Token Reached Center Home Victory!
        token.position = 200;
        reachedHome = true;
        extraTurn = true; // Reaching Home grants Extra Turn!
        this.logHistory.unshift(`🎉 ${player.name}'s Token #${tokenId + 1} reached HOME!`);

        // Check if player won (all 4 tokens finished)
        if (player.tokens.every((t) => t.position === 200)) {
          this.gameWinner = color;
          this.logHistory.unshift(`🏆 ${player.name} WON THE LUDO MATCH!`);
        }
      } else if (newStep > 51) {
        // Inside Home Stretch (52..56 -> 100..104)
        token.position = 100 + (newStep - 52);
      } else {
        // Standard Outer Circuit Movement
        const startIndex = START_CIRCUIT_INDEX[color];
        token.position = (startIndex + (newStep - 1)) % 52;

        // Check Capture on Non-Safe Cells
        const isSafe = SAFE_CIRCUIT_INDEXES.includes(token.position);
        if (!isSafe) {
          for (const [otherColor, otherPlayer] of this.players.entries()) {
            if (otherColor !== color) {
              const enemyToken = otherPlayer.tokens.find(
                (t) => t.position === token.position && t.position !== -1 && t.position !== 200
              );
              if (enemyToken) {
                // Capture Enemy Token!
                enemyToken.position = -1;
                enemyToken.stepCount = 0;
                capturedToken = enemyToken;
                extraTurn = true; // Capturing grants Extra Turn!
                this.logHistory.unshift(`⚔️ ${player.name} CAPTURED ${otherPlayer.name}'s token!`);
                break;
              }
            }
          }
        }
      }
    }

    this.currentDice = null;

    if (!extraTurn && !this.gameWinner) {
      this.nextTurn();
    }

    return { success: true, captured: capturedToken, reachedHome, extraTurn };
  }

  nextTurn() {
    this.currentDice = null;
    this.consecutiveSixes = 0;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
  }
}
