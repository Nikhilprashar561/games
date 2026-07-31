import Phaser from 'phaser';

export class BoardRenderer {
  private scene: Phaser.Scene;
  private boardSize: number;

  constructor(scene: Phaser.Scene, boardSize: number = 600) {
    this.scene = scene;
    this.boardSize = boardSize;
  }

  public renderBoard(): void {
    const graphics = this.scene.add.graphics();
    const bs = this.boardSize;
    const cx = bs / 2;
    const cy = bs / 2;

    // 1. Dark Wooden Outer Frame
    graphics.fillStyle(0x451a03, 1); // Rich Mahogany / Rosewood Frame
    graphics.fillRoundedRect(0, 0, bs, bs, 20);

    // Inner Bezel Border
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRoundedRect(16, 16, bs - 32, bs - 32, 12);

    // 2. Main Playing Surface (Polished Blonde Wood Felt)
    const playSize = bs - 48;
    graphics.fillStyle(0xfef3c7, 1); // Soft Warm Cream Wood Surface
    graphics.fillRect(24, 24, playSize, playSize);

    // Frame Outline Lines
    graphics.lineStyle(2, 0x92400e, 0.6);
    graphics.strokeRect(24, 24, playSize, playSize);

    // 3. Four Corner Pockets (Deep Hole Radii)
    const pocketOffset = 46;
    const pocketRadius = 26;

    const pockets = [
      [pocketOffset, pocketOffset],
      [bs - pocketOffset, pocketOffset],
      [pocketOffset, bs - pocketOffset],
      [bs - pocketOffset, bs - pocketOffset],
    ];

    pockets.forEach(([px, py]) => {
      graphics.fillStyle(0x0f172a, 1);
      graphics.fillCircle(px, py, pocketRadius);
      graphics.lineStyle(2.5, 0x451a03, 0.9);
      graphics.strokeCircle(px, py, pocketRadius);
    });

    // 4. Center Rosette Circle
    graphics.lineStyle(2, 0xe11d48, 0.8);
    graphics.strokeCircle(cx, cy, 32);
    graphics.fillStyle(0xe11d48, 0.15);
    graphics.fillCircle(cx, cy, 32);

    // Inner Red Center Spot
    graphics.fillStyle(0xe11d48, 1);
    graphics.fillCircle(cx, cy, 8);

    // 5. Four Baseline Aiming Tracks (Top, Bottom, Left, Right)
    const trackPadding = 80;
    graphics.lineStyle(2, 0xb45309, 0.75);

    // Bottom Baseline
    graphics.lineBetween(trackPadding, bs - trackPadding, bs - trackPadding, bs - trackPadding);
    graphics.fillStyle(0xb45309, 1);
    graphics.fillCircle(trackPadding, bs - trackPadding, 10);
    graphics.fillCircle(bs - trackPadding, bs - trackPadding, 10);

    // Top Baseline
    graphics.lineBetween(trackPadding, trackPadding, bs - trackPadding, trackPadding);
    graphics.fillCircle(trackPadding, trackPadding, 10);
    graphics.fillCircle(bs - trackPadding, trackPadding, 10);

    // Left Baseline
    graphics.lineBetween(trackPadding, trackPadding, trackPadding, bs - trackPadding);

    // Right Baseline
    graphics.lineBetween(bs - trackPadding, trackPadding, bs - trackPadding, bs - trackPadding);
  }
}
