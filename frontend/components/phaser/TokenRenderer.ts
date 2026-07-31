import Phaser from 'phaser';

export interface TokenState {
  id: number; // 0..3
  color: 'red' | 'green' | 'yellow' | 'blue';
  position: number; // -1 = Base, 0..51 = Circuit, 100..104 = Home Stretch, 200 = Finished Home
  stepCount: number;
}

export class TokenRenderer {
  private scene: Phaser.Scene;
  private boardSize: number;
  private tileSize: number;
  private tokenSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private pulseTweens: Map<string, Phaser.Tweens.Tween> = new Map();

  constructor(scene: Phaser.Scene, boardSize: number = 600) {
    this.scene = scene;
    this.boardSize = boardSize;
    this.tileSize = boardSize / 15;
  }

  public getTokenSprite(color: string, id: number): Phaser.GameObjects.Sprite | undefined {
    return this.tokenSprites.get(`${color}_${id}`);
  }

  /**
   * Spawns or updates all 16 tokens based on React state
   */
  public updateTokens(tokens: Record<string, TokenState[]>, activePlayerColor?: string, validTokenIds: number[] = []): void {
    const ts = this.tileSize;

    Object.entries(tokens).forEach(([color, tokenList]) => {
      tokenList.forEach((token) => {
        const key = `${color}_${token.id}`;
        let sprite = this.tokenSprites.get(key);

        const targetPos = this.calculatePixelCoords(color as any, token.id, token.position);

        if (!sprite) {
          sprite = this.scene.add.sprite(targetPos.x, targetPos.y, `pawn_${color}`);
          sprite.setOrigin(0.5, 0.7);
          sprite.setDepth(10);
          sprite.setInteractive({ useHandCursor: true });
          sprite.on('pointerdown', () => {
            const scene = this.scene as any;
            if (scene && scene.onTokenClick) {
              scene.onTokenClick(color, token.id);
            }
          });
          this.tokenSprites.set(key, sprite);
        } else {
          // If sprite is not currently tweening/animating, place at exact coordinates
          if (!this.scene.tweens.isTweening(sprite)) {
            sprite.setPosition(targetPos.x, targetPos.y);
          }
        }

        // Highlight selectable tokens for active player
        const isSelectable = activePlayerColor === color && validTokenIds.includes(token.id);
        this.setTokenPulsing(key, sprite, isSelectable);
      });
    });
  }

  private setTokenPulsing(key: string, sprite: Phaser.GameObjects.Sprite, pulse: boolean): void {
    let tween = this.pulseTweens.get(key);

    if (pulse) {
      if (!tween) {
        sprite.setDepth(20);
        tween = this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.pulseTweens.set(key, tween);
      }
    } else {
      if (tween) {
        tween.stop();
        this.pulseTweens.delete(key);
        sprite.setScale(1, 1);
        sprite.setDepth(10);
      }
    }
  }

  /**
   * Calculates pixel (x, y) coordinates on the 15x15 Phaser canvas
   */
  public calculatePixelCoords(color: 'red' | 'green' | 'yellow' | 'blue', tokenId: number, position: number): { x: number; y: number } {
    const ts = this.tileSize;

    // 1. In Base (-1)
    if (position === -1) {
      const baseOffsets: Record<string, [number, number][]> = {
        red: [[2, 2], [4, 2], [2, 4], [4, 4]],
        green: [[11, 2], [13, 2], [11, 4], [13, 4]],
        yellow: [[11, 11], [13, 11], [11, 13], [13, 13]],
        blue: [[2, 11], [4, 11], [2, 13], [4, 13]],
      };
      const [col, row] = baseOffsets[color][tokenId];
      return { x: col * ts, y: row * ts };
    }

    // 2. Finished Home (200)
    if (position === 200) {
      return { x: 7.5 * ts, y: 7.5 * ts };
    }

    // 3. Home Stretch (100..104)
    if (position >= 100 && position <= 104) {
      const idx = position - 100;
      const stretchCoords: Record<string, [number, number][]> = {
        red: [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
        green: [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6]],
        yellow: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8]],
        blue: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10]],
      };
      const [col, row] = stretchCoords[color][idx];
      return { x: (col - 0.5) * ts, y: (row - 0.5) * ts };
    }

    // 4. Circuit Track (0..51)
    const CIRCUIT_GRID_COORDS: [number, number][] = [
      [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
      [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
      [1, 8], [1, 9],
      [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
      [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15],
      [8, 15], [9, 15],
      [9, 14], [9, 13], [9, 12], [9, 11], [9, 10],
      [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
      [15, 8], [15, 7],
      [14, 7], [13, 7], [12, 7], [11, 7], [10, 7],
      [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1],
      [8, 1], [7, 1],
    ];

    const [row, col] = CIRCUIT_GRID_COORDS[position % 52];
    return { x: (col - 0.5) * ts, y: (row - 0.5) * ts };
  }
}
