import Phaser from 'phaser';

export class BoardRenderer {
  private scene: Phaser.Scene;
  private boardSize: number;
  private tileSize: number;

  constructor(scene: Phaser.Scene, boardSize: number = 600) {
    this.scene = scene;
    this.boardSize = boardSize;
    this.tileSize = boardSize / 15;
  }

  public renderBoard(): void {
    const graphics = this.scene.add.graphics();
    const ts = this.tileSize;

    // 1. Clean White Board Background
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, this.boardSize, this.boardSize, 16);

    // Clean crisp slate grid lines on white board background
    graphics.lineStyle(1.5, 0xcbd5e1, 1);

    // Draw 15x15 grid squares with white fill and crisp slate borders
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(c * ts, r * ts, ts, ts);
        graphics.strokeRect(c * ts, r * ts, ts, ts);
      }
    }

    // 2. Base Home Quadrants
    // Red (Top-Left: 0..5, 0..5)
    this.drawBaseQuadrant(graphics, 0, 0, 0xe11d48);
    // Green (Top-Right: 0..5, 9..14)
    this.drawBaseQuadrant(graphics, 9 * ts, 0, 0x16a34a);
    // Yellow (Bottom-Right: 9..14, 9..14)
    this.drawBaseQuadrant(graphics, 9 * ts, 9 * ts, 0xeab308);
    // Blue (Bottom-Left: 9..14, 0..5)
    this.drawBaseQuadrant(graphics, 0, 9 * ts, 0x2563eb);

    // 3. Home Stretch Colored Path Fill
    // Red Home Stretch (row 7, col 1..5)
    graphics.fillStyle(0xe11d48, 0.9);
    for (let c = 1; c <= 5; c++) graphics.fillRect(c * ts, 7 * ts, ts, ts);

    // Green Home Stretch (col 7, row 1..5)
    graphics.fillStyle(0x16a34a, 0.9);
    for (let r = 1; r <= 5; r++) graphics.fillRect(7 * ts, r * ts, ts, ts);

    // Yellow Home Stretch (row 7, col 9..13)
    graphics.fillStyle(0xeab308, 0.9);
    for (let c = 9; c <= 13; c++) graphics.fillRect(c * ts, 7 * ts, ts, ts);

    // Blue Home Stretch (col 7, row 9..13)
    graphics.fillStyle(0x2563eb, 0.9);
    for (let r = 9; r <= 13; r++) graphics.fillRect(7 * ts, r * ts, ts, ts);

    // 4. Start Tiles
    graphics.fillStyle(0xe11d48, 1); graphics.fillRect(1 * ts, 6 * ts, ts, ts); // Red Start
    graphics.fillStyle(0x16a34a, 1); graphics.fillRect(8 * ts, 1 * ts, ts, ts); // Green Start
    graphics.fillStyle(0xeab308, 1); graphics.fillRect(13 * ts, 8 * ts, ts, ts); // Yellow Start
    graphics.fillStyle(0x2563eb, 1); graphics.fillRect(6 * ts, 13 * ts, ts, ts); // Blue Start

    // Re-apply crisp grid lines over colored tiles
    graphics.lineStyle(1.5, 0x0f172a, 0.4);
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        graphics.strokeRect(c * ts, r * ts, ts, ts);
      }
    }

    // 5. Center Home Victory Triangles (6..8, 6..8)
    const cx = 7.5 * ts;
    const cy = 7.5 * ts;

    // Red Center Triangle
    graphics.fillStyle(0xe11d48, 1);
    graphics.fillTriangle(6 * ts, 6 * ts, 6 * ts, 9 * ts, cx, cy);

    // Green Center Triangle
    graphics.fillStyle(0x16a34a, 1);
    graphics.fillTriangle(6 * ts, 6 * ts, 9 * ts, 6 * ts, cx, cy);

    // Yellow Center Triangle
    graphics.fillStyle(0xeab308, 1);
    graphics.fillTriangle(9 * ts, 6 * ts, 9 * ts, 9 * ts, cx, cy);

    // Blue Center Triangle
    graphics.fillStyle(0x2563eb, 1);
    graphics.fillTriangle(6 * ts, 9 * ts, 9 * ts, 9 * ts, cx, cy);

    // Center bezel border outline
    graphics.lineStyle(2, 0x0f172a, 0.8);
    graphics.strokeRect(6 * ts, 6 * ts, 3 * ts, 3 * ts);

    // Safe Star Spots
    const safeSpots: [number, number][] = [
      [6, 1], [1, 8], [8, 13], [13, 6], // Starts
      [2, 6], [6, 12], [12, 8], [8, 2], // Star Safe Squares
    ];

    safeSpots.forEach(([r, c]) => {
      this.scene.add.image(c * ts + ts / 2, r * ts + ts / 2, 'star_icon').setScale(0.85);
    });
  }

  private drawBaseQuadrant(graphics: Phaser.GameObjects.Graphics, x: number, y: number, colorHex: number): void {
    const ts = this.tileSize;
    const size = 6 * ts;

    // Outer color box
    graphics.fillStyle(colorHex, 0.95);
    graphics.fillRoundedRect(x, y, size, size, 12);

    // Inner white container
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillRoundedRect(x + ts, y + ts, 4 * ts, 4 * ts, 8);

    // 4 Token Circles in Base
    const coords = [
      [x + 2 * ts, y + 2 * ts],
      [x + 4 * ts, y + 2 * ts],
      [x + 2 * ts, y + 4 * ts],
      [x + 4 * ts, y + 4 * ts],
    ];

    coords.forEach(([cx, cy]) => {
      graphics.fillStyle(colorHex, 0.2);
      graphics.fillCircle(cx, cy, ts * 0.7);
      graphics.fillStyle(colorHex, 1);
      graphics.fillCircle(cx, cy, ts * 0.45);
    });
  }
}
