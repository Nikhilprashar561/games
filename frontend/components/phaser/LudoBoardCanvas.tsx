'use client';

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { LudoPhaserScene } from './LudoPhaserScene';
import { TokenState } from './TokenRenderer';

interface LudoBoardCanvasProps {
  tokens: Record<string, TokenState[]>;
  activePlayerColor?: string;
  validTokenIds?: number[];
  onTokenClick?: (color: string, id: number) => void;
  lastMovedToken?: { color: 'red' | 'green' | 'yellow' | 'blue'; id: number; path: number[] } | null;
}

export default function LudoBoardCanvas({
  tokens,
  activePlayerColor,
  validTokenIds = [],
  onTokenClick,
  lastMovedToken,
}: LudoBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<LudoPhaserScene | null>(null);

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
      scene: [LudoPhaserScene],
      physics: {
        default: 'arcade',
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.once('ready', () => {
      const scene = game.scene.getScene('LudoPhaserScene') as LudoPhaserScene;
      sceneRef.current = scene;
      if (scene) {
        scene.onTokenClick = onTokenClick;
        scene.updateTokensState(tokens, activePlayerColor, validTokenIds);
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

  // Update tokens state when React state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateTokensState(tokens, activePlayerColor, validTokenIds);
    }
  }, [tokens, activePlayerColor, validTokenIds]);

  // Animate step-by-step token movement path
  useEffect(() => {
    if (sceneRef.current && lastMovedToken && lastMovedToken.path.length > 0) {
      sceneRef.current.animateStepMove(
        lastMovedToken.color,
        lastMovedToken.id,
        lastMovedToken.path
      );
    }
  }, [lastMovedToken]);

  return (
    <div className="w-full flex justify-center items-center">
      <div
        ref={containerRef}
        className="w-full max-w-[560px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800"
      />
    </div>
  );
}
