import Phaser from 'phaser';
import { AssetLoader } from './AssetLoader';
import { BoardRenderer } from './BoardRenderer';
import { TokenRenderer, SnakePlayerState } from './TokenRenderer';
import { AnimationManager } from './AnimationManager';

export class SnakePhaserScene extends Phaser.Scene {
  private boardRenderer!: BoardRenderer;
  public tokenRenderer!: TokenRenderer;
  public animationManager!: AnimationManager;

  constructor() {
    super({ key: 'SnakePhaserScene' });
  }

  public preload(): void {
    AssetLoader.generateTextures(this);
  }

  public create(): void {
    const width = this.scale.width;
    this.boardRenderer = new BoardRenderer(this, width);
    this.tokenRenderer = new TokenRenderer(this, width);
    this.animationManager = new AnimationManager(this, width);

    this.boardRenderer.renderBoard();
  }

  public updatePlayersState(players: SnakePlayerState[], activePlayerColor?: string): void {
    if (this.tokenRenderer) {
      this.tokenRenderer.updateTokens(players, activePlayerColor);
    }
  }

  public animateMove(
    color: string,
    stepPath: number[],
    finalPosition: number,
    isSnake: boolean,
    isLadder: boolean,
    onComplete?: () => void
  ): void {
    if (!this.tokenRenderer || !this.animationManager) return;
    const sprite = this.tokenRenderer.getTokenSprite(color);
    if (sprite) {
      this.animationManager.animateFullMove(sprite, stepPath, finalPosition, isSnake, isLadder, onComplete);
    }
  }
}
