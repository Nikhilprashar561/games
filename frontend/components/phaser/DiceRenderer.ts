import Phaser from 'phaser';

export class DiceRenderer {
  private scene: Phaser.Scene;
  private diceContainer: Phaser.GameObjects.Container | null = null;
  private diceText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public renderDice(x: number, y: number): void {
    if (this.diceContainer) return;

    this.diceContainer = this.scene.add.container(x, y);

    // Dice Base Box
    const box = this.scene.add.rectangle(0, 0, 56, 56, 0xffffff);
    box.setStrokeStyle(3, 0x0f172a);
    
    // Dice Text Indicator
    this.diceText = this.scene.add.text(0, 0, '🎲', {
      fontSize: '32px',
    });
    this.diceText.setOrigin(0.5, 0.5);

    this.diceContainer.add([box, this.diceText]);
    this.diceContainer.setDepth(100);
  }

  /**
   * Animates realistic dice rolling rotation, scaling, and shadow bounce
   */
  public animateRoll(finalValue: number, onComplete?: () => void): void {
    if (!this.diceContainer || !this.diceText) return;

    this.scene.tweens.add({
      targets: this.diceContainer,
      angle: 720,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 650,
      ease: 'Cubic.easeOut',
      yoyo: true,
      onUpdate: () => {
        const tempVal = Math.floor(1 + Math.random() * 6);
        this.diceText!.setText(`${tempVal}`);
      },
      onComplete: () => {
        this.diceContainer!.setAngle(0);
        this.diceContainer!.setScale(1, 1);
        this.diceText!.setText(`${finalValue}`);
        if (onComplete) onComplete();
      },
    });
  }
}
