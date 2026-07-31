import Phaser from 'phaser';

export class EffectManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a 360-degree particle explosion on token capture
   */
  public triggerCaptureExplosion(x: number, y: number, colorHex: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 100, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 600,
      gravityY: 150,
      quantity: 24,
      tint: colorHex,
    });

    this.scene.time.delayedCall(600, () => {
      emitter.destroy();
    });
  }

  /**
   * Spawns a subtle landing pulse ring when a token steps on a tile
   */
  public triggerLandingPulse(x: number, y: number, colorHex: number): void {
    const circle = this.scene.add.circle(x, y, 6, colorHex, 0.6);

    this.scene.tweens.add({
      targets: circle,
      radius: 22,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  /**
   * Spawns a celebratory sparkle burst when a token reaches the home center
   */
  public triggerVictoryBurst(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_spark', {
      speed: { min: 150, max: 350 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      gravityY: 80,
      quantity: 40,
      tint: [0xffd700, 0x00ffcc, 0xff007f, 0x76ff03],
    });

    this.scene.time.delayedCall(1000, () => {
      emitter.destroy();
    });
  }
}
