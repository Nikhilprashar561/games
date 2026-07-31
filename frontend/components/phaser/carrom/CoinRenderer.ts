import Phaser from 'phaser';
import Matter from 'matter-js';

export class CoinRenderer {
  private scene: Phaser.Scene;
  private coinSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public syncCoins(bodies: Map<string, Matter.Body>, coinTypes: Map<string, string>): void {
    bodies.forEach((body, id) => {
      let sprite = this.coinSprites.get(id);
      const type = coinTypes.get(id) || 'WHITE';

      const textureKey =
        type === 'STRIKER'
          ? 'carrom_striker'
          : type === 'QUEEN'
          ? 'carrom_coin_queen'
          : type === 'BLACK'
          ? 'carrom_coin_black'
          : 'carrom_coin_white';

      if (!sprite) {
        sprite = this.scene.add.sprite(body.position.x, body.position.y, textureKey);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(type === 'STRIKER' ? 15 : 10);
        this.coinSprites.set(id, sprite);
      } else {
        sprite.setPosition(body.position.x, body.position.y);
        sprite.setRotation(body.angle);
      }
    });
  }

  public removeCoinSprite(id: string): void {
    const sprite = this.coinSprites.get(id);
    if (sprite) {
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 250,
        ease: 'Power2.easeIn',
        onComplete: () => {
          sprite.destroy();
          this.coinSprites.delete(id);
        },
      });
    }
  }

  public clearAll(): void {
    this.coinSprites.forEach((s) => s.destroy());
    this.coinSprites.clear();
  }
}
