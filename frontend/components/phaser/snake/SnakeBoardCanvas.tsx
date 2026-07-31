'use client';

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { SnakePhaserScene } from './SnakePhaserScene';
import { SnakePlayerState } from './TokenRenderer';

interface SnakeBoardCanvasProps {
  players: SnakePlayerState[];
  activePlayerColor?: string;
  lastMoveAction?: {
    color: string;
    stepPath: number[];
    finalPosition: number;
    isSnake: boolean;
    isLadder: boolean;
  } | null;
}

export default function SnakeBoardCanvas({
  players,
  activePlayerColor,
  lastMoveAction,
}: SnakeBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<SnakePhaserScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const width = containerRef.current.clientWidth || 560;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: width,
      height: width,
      backgroundColor: '#ffffff',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [SnakePhaserScene],
      physics: {
        default: 'arcade',
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.once('ready', () => {
      const scene = game.scene.getScene('SnakePhaserScene') as SnakePhaserScene;
      sceneRef.current = scene;
      if (scene) {
        scene.updatePlayersState(players, activePlayerColor);
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

  // Update players position state when React state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updatePlayersState(players, activePlayerColor);
    }
  }, [players, activePlayerColor]);

  // Animate move action when lastMoveAction is triggered
  useEffect(() => {
    if (sceneRef.current && lastMoveAction && lastMoveAction.stepPath.length > 0) {
      sceneRef.current.animateMove(
        lastMoveAction.color,
        lastMoveAction.stepPath,
        lastMoveAction.finalPosition,
        lastMoveAction.isSnake,
        lastMoveAction.isLadder
      );
    }
  }, [lastMoveAction]);

  return (
    <div className="w-full max-w-[600px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900/10 dark:border-slate-800">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
