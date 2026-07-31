import Phaser from 'phaser';

export class AnimationManager {
  private scene: Phaser.Scene;
  private boardSize: number;
  private tileSize: number;

  constructor(scene: Phaser.Scene, boardSize: number = 600) {
    this.scene = scene;
    this.boardSize = boardSize;
    this.tileSize = boardSize / 10;
  }

  private getCellPixelCoords(cellNum: number): { x: number; y: number } {
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

  /**
   * Animates step-by-step box hopping, then snake slide or ladder climb if applicable
   */
  public animateFullMove(
    sprite: Phaser.GameObjects.Sprite,
    stepPath: number[], // e.g. [12, 13, 14, 15]
    finalPosition: number, // destination after snake/ladder (e.g. 38 or 7)
    isSnake: boolean,
    isLadder: boolean,
    onComplete?: () => void
  ): void {
    if (!sprite || stepPath.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    // Step-by-step sequential box hops
    let chain: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    stepPath.forEach((cellNum) => {
      const target = this.getCellPixelCoords(cellNum);
      chain.push({
        targets: sprite,
        x: target.x,
        y: target.y,
        duration: 160,
        ease: 'Sine.easeInOut',
      });
    });

    this.scene.tweens.chain({
      targets: sprite,
      tweens: chain,
      onComplete: () => {
        if (isLadder) {
          this.animateLadderClimb(sprite, stepPath[stepPath.length - 1], finalPosition, onComplete);
        } else if (isSnake) {
          this.animateSnakeSlide(sprite, stepPath[stepPath.length - 1], finalPosition, onComplete);
        } else {
          if (onComplete) onComplete();
        }
      },
    });
  }

  public animateLadderClimb(
    sprite: Phaser.GameObjects.Sprite,
    fromCell: number,
    toCell: number,
    onComplete?: () => void
  ): void {
    const endPos = this.getCellPixelCoords(toCell);

    // Sparkle particle burst
    const particles = this.scene.add.particles(sprite.x, sprite.y, 'snake_particle_spark', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      blendMode: 'ADD',
      quantity: 16,
    });

    this.scene.tweens.add({
      targets: sprite,
      x: endPos.x,
      y: endPos.y,
      duration: 650,
      ease: 'Power2.easeOut',
      onComplete: () => {
        particles.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  public animateSnakeSlide(
    sprite: Phaser.GameObjects.Sprite,
    fromCell: number,
    toCell: number,
    onComplete?: () => void
  ): void {
    const endPos = this.getCellPixelCoords(toCell);

    this.scene.tweens.add({
      targets: sprite,
      x: endPos.x,
      y: endPos.y,
      duration: 750,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  }
}
