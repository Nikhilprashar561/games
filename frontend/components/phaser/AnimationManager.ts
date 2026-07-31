import Phaser from 'phaser';
import { TokenRenderer } from './TokenRenderer';
import { EffectManager } from './EffectManager';
import { SoundManager } from './SoundManager';

export class AnimationManager {
  private scene: Phaser.Scene;
  private tokenRenderer: TokenRenderer;
  private effectManager: EffectManager;
  private soundManager: SoundManager;

  constructor(
    scene: Phaser.Scene,
    tokenRenderer: TokenRenderer,
    effectManager: EffectManager,
    soundManager: SoundManager
  ) {
    this.scene = scene;
    this.tokenRenderer = tokenRenderer;
    this.effectManager = effectManager;
    this.soundManager = soundManager;
  }

  /**
   * Animates token step-by-step tile hopping movement with easing and landing pulse
   */
  public animateTokenMovePath(
    color: 'red' | 'green' | 'yellow' | 'blue',
    tokenId: number,
    pathPositions: number[],
    onComplete?: () => void
  ): void {
    const sprite = this.tokenRenderer.getTokenSprite(color, tokenId);
    if (!sprite || pathPositions.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    let chainIndex = 0;

    const animateNextStep = () => {
      if (chainIndex >= pathPositions.length) {
        // Final position reached
        const finalPos = pathPositions[pathPositions.length - 1];
        const finalCoords = this.tokenRenderer.calculatePixelCoords(color, tokenId, finalPos);

        const colorHexMap: Record<string, number> = {
          red: 0xe11d48,
          green: 0x16a34a,
          yellow: 0xeab308,
          blue: 0x2563eb,
        };

        // If reached final home center (200), trigger victory burst!
        if (finalPos === 200) {
          this.effectManager.triggerVictoryBurst(finalCoords.x, finalCoords.y);
          this.soundManager.playVictory();
        } else {
          this.effectManager.triggerLandingPulse(finalCoords.x, finalCoords.y, colorHexMap[color]);
        }

        if (onComplete) onComplete();
        return;
      }

      const nextPos = pathPositions[chainIndex];
      const targetCoords = this.tokenRenderer.calculatePixelCoords(color, tokenId, nextPos);

      this.soundManager.playTokenStep();

      // Hop animation tween (scale & position interpolation)
      this.scene.tweens.add({
        targets: sprite,
        x: targetCoords.x,
        y: targetCoords.y,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 160,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: sprite,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              chainIndex++;
              this.scene.time.delayedCall(60, animateNextStep);
            },
          });
        },
      });
    };

    animateNextStep();
  }
}
