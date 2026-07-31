import Phaser from 'phaser';

export class AssetLoader {
  /**
   * Generates procedural graphics and textures for pawns, board highlights, snakes, ladders, and particles.
   */
  public static generateTextures(scene: Phaser.Scene): void {
    const colors: Record<string, { main: number; dark: number }> = {
      red: { main: 0xe11d48, dark: 0x9f1239 },
      blue: { main: 0x2563eb, dark: 0x1e3a8a },
      green: { main: 0x16a34a, dark: 0x14532d },
      yellow: { main: 0xca8a04, dark: 0x713f12 },
    };

    // 1. Generate Glossy 3D Pawn Sprites for each color
    Object.entries(colors).forEach(([colorName, colorData]) => {
      const textureKey = `snake_pawn_${colorName}`;
      if (scene.textures.exists(textureKey)) return;

      const graphics = scene.make.graphics({ x: 0, y: 0 });

      // Ground Drop Shadow
      graphics.fillStyle(0x000000, 0.3);
      graphics.fillEllipse(20, 44, 14, 5);

      // Pawn Body (Base & Stem)
      graphics.fillStyle(colorData.dark, 1);
      graphics.fillCircle(20, 32, 12);
      graphics.fillTriangle(20, 10, 8, 32, 32, 32);

      graphics.fillStyle(colorData.main, 1);
      graphics.fillCircle(20, 31, 11);
      graphics.fillTriangle(20, 10, 9, 31, 31, 31);

      // Pawn Spherical Top Head
      graphics.fillStyle(0xffffff, 0.95);
      graphics.fillCircle(20, 12, 7);
      graphics.fillStyle(colorData.main, 1);
      graphics.fillCircle(20, 12, 5.5);

      // Glossy Top Specular Light Highlight
      graphics.fillStyle(0xffffff, 0.6);
      graphics.fillCircle(17, 9, 2);

      graphics.generateTexture(textureKey, 40, 48);
      graphics.destroy();
    });

    // 2. Generate Particle Sparkle Texture
    if (!scene.textures.exists('snake_particle_spark')) {
      const pGraphics = scene.make.graphics({ x: 0, y: 0 });
      pGraphics.fillStyle(0xffffff, 1);
      pGraphics.fillCircle(8, 8, 8);
      pGraphics.generateTexture('snake_particle_spark', 16, 16);
      pGraphics.destroy();
    }

    // 3. Generate Snake Head & Tail Indicators
    if (!scene.textures.exists('snake_head_icon')) {
      const sGraphics = scene.make.graphics({ x: 0, y: 0 });
      sGraphics.fillStyle(0xd97706, 1);
      sGraphics.fillCircle(12, 12, 10);
      sGraphics.fillStyle(0x0f172a, 1);
      sGraphics.fillCircle(8, 8, 2.5);
      sGraphics.fillCircle(16, 8, 2.5);
      sGraphics.generateTexture('snake_head_icon', 24, 24);
      sGraphics.destroy();
    }
  }
}
