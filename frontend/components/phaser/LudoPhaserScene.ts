import Phaser from 'phaser';
import { AssetLoader } from './AssetLoader';
import { BoardRenderer } from './BoardRenderer';
import { TokenRenderer, TokenState } from './TokenRenderer';
import { DiceRenderer } from './DiceRenderer';
import { EffectManager } from './EffectManager';
import { SoundManager } from './SoundManager';
import { AnimationManager } from './AnimationManager';

export class LudoPhaserScene extends Phaser.Scene {
  private boardRenderer!: BoardRenderer;
  public tokenRenderer!: TokenRenderer;
  public diceRenderer!: DiceRenderer;
  public effectManager!: EffectManager;
  public soundManager!: SoundManager;
  public animationManager!: AnimationManager;
  public onTokenClick?: (color: string, id: number) => void;

  constructor() {
    super({ key: 'LudoPhaserScene' });
  }

  public create(): void {
    // 1. Generate procedural textures
    AssetLoader.generateTextures(this);

    // 2. Initialize modules
    const boardSize = Math.min(this.scale.width, this.scale.height);

    this.boardRenderer = new BoardRenderer(this, boardSize);
    this.tokenRenderer = new TokenRenderer(this, boardSize);
    this.diceRenderer = new DiceRenderer(this);
    this.effectManager = new EffectManager(this);
    this.soundManager = new SoundManager(this);
    this.animationManager = new AnimationManager(
      this,
      this.tokenRenderer,
      this.effectManager,
      this.soundManager
    );

    // 3. Render 15x15 board
    this.boardRenderer.renderBoard();
  }

  public updateTokensState(tokens: Record<string, TokenState[]>, activePlayerColor?: string, validTokenIds: number[] = []): void {
    if (this.tokenRenderer) {
      this.tokenRenderer.updateTokens(tokens, activePlayerColor, validTokenIds);
    }
  }

  public animateStepMove(color: 'red' | 'green' | 'yellow' | 'blue', tokenId: number, pathPositions: number[], onComplete?: () => void): void {
    if (this.animationManager) {
      this.animationManager.animateTokenMovePath(color, tokenId, pathPositions, onComplete);
    }
  }

  public triggerCapture(x: number, y: number, colorHex: number): void {
    if (this.effectManager && this.soundManager) {
      this.effectManager.triggerCaptureExplosion(x, y, colorHex);
      this.soundManager.playCapture();
    }
  }
}
