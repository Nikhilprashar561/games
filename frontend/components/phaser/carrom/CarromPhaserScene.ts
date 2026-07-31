import Phaser from 'phaser';
import { AssetLoader } from './AssetLoader';
import { BoardRenderer } from './BoardRenderer';
import { PhysicsEngine, PhysicsCoinData } from './PhysicsEngine';
import { CoinRenderer } from './CoinRenderer';
import { AnimationManager } from './AnimationManager';

export class CarromPhaserScene extends Phaser.Scene {
  public boardRenderer!: BoardRenderer;
  public physicsEngine!: PhysicsEngine;
  public coinRenderer!: CoinRenderer;
  public animationManager!: AnimationManager;
  public coinTypesMap: Map<string, string> = new Map();
  public onShotComplete?: (pocketedIds: string[]) => void;

  private isSimulationRunning: boolean = false;

  constructor() {
    super({ key: 'CarromPhaserScene' });
  }

  public preload(): void {
    AssetLoader.generateTextures(this);
  }

  public create(): void {
    const width = this.scale.width;
    this.boardRenderer = new BoardRenderer(this, width);
    this.physicsEngine = new PhysicsEngine(width);
    this.coinRenderer = new CoinRenderer(this);
    this.animationManager = new AnimationManager(this);

    this.boardRenderer.renderBoard();
  }

  public initBoardCoins(coins: PhysicsCoinData[]): void {
    if (!this.physicsEngine) return;
    this.coinTypesMap.clear();
    coins.forEach((c) => this.coinTypesMap.set(c.id, c.type));
    this.physicsEngine.initCoins(coins);
    this.coinRenderer.syncCoins(this.physicsEngine.bodies, this.coinTypesMap);
  }

  public shootStriker(strikerId: string, angle: number, power: number): void {
    if (!this.physicsEngine || this.isSimulationRunning) return;
    this.animationManager.clearAimLine();
    this.physicsEngine.applyStrikerImpulse(strikerId, angle, power);
    this.isSimulationRunning = true;
  }

  public drawAim(strikerX: number, strikerY: number, angle: number, power: number): void {
    if (this.animationManager) {
      this.animationManager.drawAimLine(strikerX, strikerY, angle, power);
    }
  }

  public update(time: number, delta: number): void {
    if (this.physicsEngine && this.isSimulationRunning) {
      this.physicsEngine.stepPhysics(delta);
      this.coinRenderer.syncCoins(this.physicsEngine.bodies, this.coinTypesMap);

      const pocketed = this.physicsEngine.getPocketedCoins();
      pocketed.forEach((id) => {
        const body = this.physicsEngine.bodies.get(id);
        if (body) {
          this.coinRenderer.removeCoinSprite(id);
        }
      });

      if (this.physicsEngine.isWorldAtRest()) {
        this.isSimulationRunning = false;
        if (this.onShotComplete) {
          this.onShotComplete(pocketed);
        }
      }
    }
  }
}
