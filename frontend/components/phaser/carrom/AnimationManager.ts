import Phaser from 'phaser';

export class AnimationManager {
  private scene: Phaser.Scene;
  private aimGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.aimGraphics = this.scene.add.graphics().setDepth(20);
  }

  public drawAimLine(strikerX: number, strikerY: number, angle: number, power: number): void {
    this.aimGraphics.clear();
    const len = (power / 100) * 160 + 40;
    const endX = strikerX + Math.cos(angle) * len;
    const endY = strikerY + Math.sin(angle) * len;

    // Dotted Trajectory Line
    this.aimGraphics.lineStyle(3, 0x38bdf8, 0.85);
    this.aimGraphics.lineBetween(strikerX, strikerY, endX, endY);

    // Aim Arrow Tip
    this.aimGraphics.fillStyle(0x38bdf8, 1);
    this.aimGraphics.fillCircle(endX, endY, 6);
  }

  public clearAimLine(): void {
    this.aimGraphics.clear();
  }

  public triggerWinnerCelebration(cx: number, cy: number): void {
    const particles = this.scene.add.particles(cx, cy, 'carrom_particle_spark', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      blendMode: 'ADD',
      quantity: 30,
    });

    this.scene.time.delayedCall(1500, () => {
      particles.destroy();
    });
  }
}
