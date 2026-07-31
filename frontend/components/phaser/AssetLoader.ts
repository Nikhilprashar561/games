import Phaser from 'phaser';

export class AssetLoader {
  /**
   * Generates procedural graphics and textures for pawns, stars, dice, and particles.
   * Pawns match the 3D Teardrop Location-Pin marker design with hollow center hole.
   */
  public static generateTextures(scene: Phaser.Scene): void {
    const colors: Record<string, { main: number; dark: number; highlight: number }> = {
      red: { main: 0xe11d48, dark: 0x9f1239, highlight: 0xfca5a5 },
      green: { main: 0x16a34a, dark: 0x14532d, highlight: 0x86efac },
      yellow: { main: 0xca8a04, dark: 0x713f12, highlight: 0xfde047 },
      blue: { main: 0x2563eb, dark: 0x1e3a8a, highlight: 0x93c5fd },
    };

    // 1. Generate Glossy 3D Teardrop Location-Pin Pawn Graphics for each color
    Object.entries(colors).forEach(([colorName, colorData]) => {
      const textureKey = `pawn_${colorName}`;
      if (scene.textures.exists(textureKey)) return;

      const graphics = scene.make.graphics({ x: 0, y: 0 });

      // Ground Drop Shadow
      graphics.fillStyle(0x000000, 0.35);
      graphics.fillEllipse(22, 50, 16, 6);

      // 3D Bevel Dark Depth Layer (Slightly offset right and down for 3D extrusion)
      graphics.fillStyle(colorData.dark, 1);
      graphics.fillCircle(23, 21, 18);
      graphics.fillTriangle(23, 49, 5, 21, 41, 21);

      // Main Front Pin Body
      graphics.fillStyle(colorData.main, 1);
      graphics.fillCircle(22, 20, 18);
      graphics.fillTriangle(22, 48, 4, 20, 40, 20);

      // Inner Center Hole (Cutout circle - transparent/white rim)
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(22, 20, 8.5);

      // Inner Rim Ring Shadow
      graphics.lineStyle(1.5, colorData.dark, 0.6);
      graphics.strokeCircle(22, 20, 8.5);

      // Glossy Top-Left Specular Light Highlight Arc
      graphics.fillStyle(0xffffff, 0.45);
      graphics.fillCircle(16, 12, 4);

      graphics.generateTexture(textureKey, 46, 54);
      graphics.destroy();
    });

    // 2. Generate Particle Sparkle Texture
    if (!scene.textures.exists('particle_spark')) {
      const pGraphics = scene.make.graphics({ x: 0, y: 0 });
      pGraphics.fillStyle(0xffffff, 1);
      pGraphics.fillCircle(8, 8, 8);
      pGraphics.generateTexture('particle_spark', 16, 16);
      pGraphics.destroy();
    }

    // 3. Generate Star Icon Texture for Safe Tiles
    if (!scene.textures.exists('star_icon')) {
      const starGraphics = scene.make.graphics({ x: 0, y: 0 });
      starGraphics.fillStyle(0xd97706, 1);
      starGraphics.fillCircle(12, 12, 10);
      starGraphics.generateTexture('star_icon', 24, 24);
      starGraphics.destroy();
    }
  }
}
