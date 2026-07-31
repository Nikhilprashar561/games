import Phaser from 'phaser';

export const SNAKES_MAP: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

export const LADDERS_MAP: Record<number, number> = {
  4: 14,
  9: 31,
  19: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 96,
};

export class BoardRenderer {
  private scene: Phaser.Scene;
  private boardSize: number;
  private tileSize: number;

  constructor(scene: Phaser.Scene, boardSize: number = 600) {
    this.scene = scene;
    this.boardSize = boardSize;
    this.tileSize = boardSize / 10;
  }

  public getCellPixelCoords(cellNum: number): { x: number; y: number } {
    if (cellNum < 1) cellNum = 1;
    if (cellNum > 100) cellNum = 100;

    const rowFromBottom = Math.floor((cellNum - 1) / 10);
    const row = 9 - rowFromBottom; // 0 at top, 9 at bottom
    const isRightToLeft = rowFromBottom % 2 === 1;
    const colInRow = (cellNum - 1) % 10;
    const col = isRightToLeft ? 9 - colInRow : colInRow;

    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  public renderBoard(): void {
    const graphics = this.scene.add.graphics();
    const ts = this.tileSize;

    // 1. Clean White Board Background
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, this.boardSize, this.boardSize, 16);

    // 2. 10x10 Alternate Pastel Cell Tiles & Numbers
    const tileColors = [0xf8fafc, 0xf1f5f9, 0xe2e8f0, 0xf8fafc];

    for (let cellNum = 1; cellNum <= 100; cellNum++) {
      const coords = this.getCellPixelCoords(cellNum);
      const x = coords.x - ts / 2;
      const y = coords.y - ts / 2;

      const colorIdx = (cellNum + Math.floor((cellNum - 1) / 10)) % tileColors.length;
      graphics.fillStyle(cellNum === 100 ? 0xfef08a : tileColors[colorIdx], 1);
      graphics.fillRect(x, y, ts, ts);

      // Tile Border
      graphics.lineStyle(1, 0xcbd5e1, 0.8);
      graphics.strokeRect(x, y, ts, ts);

      // Cell Number Text
      this.scene.add
        .text(x + 4, y + 4, `${cellNum}`, {
          fontSize: `${Math.max(10, Math.floor(ts * 0.22))}px`,
          color: cellNum === 100 ? '#854d0e' : '#475569',
          fontStyle: 'bold',
        })
        .setDepth(1);
    }

    // 3. Render Ladders (Gold Rails with Rungs)
    Object.entries(LADDERS_MAP).forEach(([startCell, endCell]) => {
      const start = this.getCellPixelCoords(Number(startCell));
      const end = this.getCellPixelCoords(Number(endCell));

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const perpX = Math.cos(angle + Math.PI / 2) * (ts * 0.18);
      const perpY = Math.sin(angle + Math.PI / 2) * (ts * 0.18);

      // Ladder Side Rails
      graphics.lineStyle(4, 0xca8a04, 0.95);
      graphics.lineBetween(start.x - perpX, start.y - perpY, end.x - perpX, end.y - perpY);
      graphics.lineBetween(start.x + perpX, start.y + perpY, end.x + perpX, end.y + perpY);

      // Ladder Rungs
      const rungs = Math.max(3, Math.floor(len / (ts * 0.35)));
      graphics.lineStyle(2.5, 0xeab308, 0.95);
      for (let i = 1; i <= rungs; i++) {
        const t = i / (rungs + 1);
        const rx = start.x + dx * t;
        const ry = start.y + dy * t;
        graphics.lineBetween(rx - perpX, ry - perpY, rx + perpX, ry + perpY);
      }
    });

    // 4. Render Snakes (Vibrant Wavy Snake Vectors)
    Object.entries(SNAKES_MAP).forEach(([headCell, tailCell]) => {
      const head = this.getCellPixelCoords(Number(headCell));
      const tail = this.getCellPixelCoords(Number(tailCell));

      // Draw Snake Body (Red/Crimson Snake Curve)
      graphics.lineStyle(6, 0xe11d48, 0.9);
      graphics.lineBetween(head.x, head.y, tail.x, tail.y);

      // Snake Head Warning Ring
      graphics.fillStyle(0x9f1239, 1);
      graphics.fillCircle(head.x, head.y, ts * 0.22);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(head.x - 2, head.y - 2, 2.5);
      graphics.fillCircle(head.x + 2, head.y - 2, 2.5);
    });

    // Board Outer Border
    graphics.lineStyle(3, 0x0f172a, 0.9);
    graphics.strokeRoundedRect(0, 0, this.boardSize, this.boardSize, 16);
  }
}
