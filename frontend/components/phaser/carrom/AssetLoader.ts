import Phaser from 'phaser';

export class AssetLoader {
  /**
   * Generates procedural graphics and textures for Carrom board, coins, striker, and particles.
   */
  public static generateTextures(scene: Phaser.Scene): void {
    // 1. White Coin Texture (Ivory White with Gold Ring)
    if (!scene.textures.exists('carrom_coin_white')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xf8fafc, 1);
      g.fillCircle(14, 14, 13);
      g.lineStyle(2, 0xca8a04, 0.9);
      g.strokeCircle(14, 14, 13);
      g.fillStyle(0xe2e8f0, 1);
      g.fillCircle(14, 14, 7);
      g.generateTexture('carrom_coin_white', 28, 28);
      g.destroy();
    }

    // 2. Black Coin Texture (Dark Slate with Silver Ring)
    if (!scene.textures.exists('carrom_coin_black')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x1e293b, 1);
      g.fillCircle(14, 14, 13);
      g.lineStyle(2, 0x94a3b8, 0.9);
      g.strokeCircle(14, 14, 13);
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(14, 14, 7);
      g.generateTexture('carrom_coin_black', 28, 28);
      g.destroy();
    }

    // 3. Red Queen Coin Texture (Crimson Ruby)
    if (!scene.textures.exists('carrom_coin_queen')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xe11d48, 1);
      g.fillCircle(14, 14, 13);
      g.lineStyle(2.5, 0xfde047, 0.95);
      g.strokeCircle(14, 14, 13);
      g.fillStyle(0x9f1239, 1);
      g.fillCircle(14, 14, 7);
      g.generateTexture('carrom_coin_queen', 28, 28);
      g.destroy();
    }

    // 4. Striker Texture (Polished Ivory Striker)
    if (!scene.textures.exists('carrom_striker')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(20, 20, 18);
      g.lineStyle(3, 0x0284c7, 0.95);
      g.strokeCircle(20, 20, 18);
      g.fillStyle(0xe0f2fe, 1);
      g.fillCircle(20, 20, 10);
      g.generateTexture('carrom_striker', 40, 40);
      g.destroy();
    }

    // 5. Particle Spark
    if (!scene.textures.exists('carrom_particle_spark')) {
      const pG = scene.make.graphics({ x: 0, y: 0 });
      pG.fillStyle(0xfde047, 1);
      pG.fillCircle(6, 6, 6);
      pG.generateTexture('carrom_particle_spark', 12, 12);
      pG.destroy();
    }
  }
}
