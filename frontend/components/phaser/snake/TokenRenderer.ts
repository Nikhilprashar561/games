import Phaser from 'phaser';

export interface SnakePlayerState {
  id: string;
  name: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number; // 1..100
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
    this.tileSize = boardSize / 10;
  }

  public getTokenSprite(color: string): Phaser.GameObjects.Sprite | undefined {
    return this.tokenSprites.get(color);
  }

  public getCellPixelCoords(cellNum: number): { x: number; y: number } {
    if (cellNum < 1) cellNum = 1;
    if (cellNum > 100) cellNum = 100;

    const rowFromBottom = Math.floor((cellNum - 1) / 10);
    const row = 9 - rowFromBottom;
    const isRightToLeft = rowFromBottom % 2 === 1;
    const colInRow = (cellNum - 1) % 10;
    const col = isRightToLeft ? 9 - colInRow : colInRow;

    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  public updateTokens(players: SnakePlayerState[], activePlayerColor?: string): void {
    players.forEach((player) => {
      const color = player.color;
      let sprite = this.tokenSprites.get(color);
      const targetPos = this.getCellPixelCoords(player.position);

      if (!sprite) {
        sprite = this.scene.add.sprite(targetPos.x, targetPos.y, `snake_pawn_${color}`);
        sprite.setOrigin(0.5, 0.8);
        sprite.setDepth(10);
        this.tokenSprites.set(color, sprite);
      } else {
        if (!this.scene.tweens.isTweening(sprite)) {
          sprite.setPosition(targetPos.x, targetPos.y);
        }
      }

      const isActive = activePlayerColor === color;
      this.setTokenPulsing(color, sprite, isActive);
    });
  }

  private setTokenPulsing(color: string, sprite: Phaser.GameObjects.Sprite, pulse: boolean): void {
    let tween = this.pulseTweens.get(color);
    if (pulse) {
      if (!tween || !tween.isPlaying()) {
        tween = this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.18,
          scaleY: 1.18,
          duration: 450,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.pulseTweens.set(color, tween);
      }
    } else {
      if (tween) {
        tween.stop();
        sprite.setScale(1);
        this.pulseTweens.delete(color);
      }
    }
  }
}
