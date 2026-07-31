'use client';

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CarromPhaserScene } from './CarromPhaserScene';
import { PhysicsCoinData } from './PhysicsEngine';

interface CarromBoardCanvasProps {
  coins: PhysicsCoinData[];
  isMatchActive: boolean;
  aimAngle?: number;
  aimPower?: number;
  isAiming?: boolean;
  onShotComplete?: (pocketedIds: string[]) => void;
}

export default function CarromBoardCanvas({
  coins,
  isMatchActive,
  aimAngle = -Math.PI / 2,
  aimPower = 50,
  isAiming = false,
  onShotComplete,
}: CarromBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<CarromPhaserScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const width = containerRef.current.clientWidth || 600;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: width,
      height: width,
      backgroundColor: '#451a03',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [CarromPhaserScene],
      physics: {
        default: 'arcade',
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.once('ready', () => {
      const scene = game.scene.getScene('CarromPhaserScene') as CarromPhaserScene;
      sceneRef.current = scene;
      if (scene) {
        scene.onShotComplete = onShotComplete;
        scene.initBoardCoins(coins);
      }
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  // Sync board coins when React state changes
  useEffect(() => {
    if (sceneRef.current && isMatchActive) {
      sceneRef.current.initBoardCoins(coins);
    }
  }, [coins, isMatchActive]);

  // Update Aim line preview
  useEffect(() => {
    if (sceneRef.current && isAiming) {
      const striker = coins.find((c) => c.type === 'STRIKER');
      if (striker) {
        sceneRef.current.drawAim(striker.x, striker.y, aimAngle, aimPower);
      }
    }
  }, [aimAngle, aimPower, isAiming, coins]);

  return (
    <div className="w-full max-w-[600px] aspect-square mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-950/80">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
