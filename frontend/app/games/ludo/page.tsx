'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../context/AuthContext';

const LudoBoardCanvas = dynamic(() => import('../../../components/phaser/LudoBoardCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[560px] aspect-square rounded-3xl bg-slate-900 animate-pulse flex items-center justify-center text-slate-400 font-bold">
      Loading Phaser 60FPS Ludo Engine...
    </div>
  ),
});
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCcw,
  Wallet,
  Clock,
  Volume2,
  VolumeX,
  Users,
  Trophy,
  Crown,
  ShieldCheck,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Award,
  LogOut,
  Star,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
type GameMode = '1v1' | '1v2' | '1v3';

interface Token {
  id: number; // 0..3
  color: PlayerColor;
  position: number; // -1 = Base, 0..51 = Circuit, 100..104 = Home Stretch, 200 = Finished Home
  stepCount: number; // 0 = Base, 1..52 = Outer, 53..57 = Home Finish
}

// 52 Outer Track Coordinates mapped on 15x15 grid [row (1..15), col (1..15)]
const CIRCUIT_GRID_COORDS: [number, number][] = [
  [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],    // 0..4 (Red Start)
  [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7], // 5..10
  [1, 8], [1, 9],                             // 11..12
  [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],    // 13..17 (Green Start: 13)
  [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15], // 18..23
  [8, 15], [9, 15],                           // 24..25
  [9, 14], [9, 13], [9, 12], [9, 11], [9, 10], // 26..30 (Yellow Start: 26)
  [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], // 31..36
  [15, 8], [15, 7],                           // 37..38
  [14, 7], [13, 7], [12, 7], [11, 7], [10, 7], // 39..43 (Blue Start: 39)
  [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1], // 44..49
  [8, 1], [7, 1],                             // 50..51
];

// Color Home Stretches [row, col]
const HOME_STRETCH_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6]],
  green: [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
  yellow: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10]],
  blue: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8]],
};

const SAFE_INDEXES = [0, 8, 13, 21, 26, 34, 39, 47];
const START_INDEXES: Record<PlayerColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };

const OPPOSITE_COLORS: Record<PlayerColor, PlayerColor> = {
  red: 'yellow',
  yellow: 'red',
  green: 'blue',
  blue: 'green',
};

// Visual theme per color — tuned to match the reference board art (deep saturated tiles + glossy pawns)
const COLOR_THEME: Record<PlayerColor, { base: string; tile: string; text: string; grad: [string, string]; ring: string }> = {
  red: { base: 'bg-rose-600', tile: 'bg-rose-600', text: 'text-white', grad: ['#fda4af', '#9f1239'], ring: '#fecdd3' },
  green: { base: 'bg-green-600', tile: 'bg-green-600', text: 'text-white', grad: ['#86efac', '#166534'], ring: '#bbf7d0' },
  yellow: { base: 'bg-amber-500', tile: 'bg-amber-500', text: 'text-slate-950', grad: ['#fde68a', '#b45309'], ring: '#fef3c7' },
  blue: { base: 'bg-blue-600', tile: 'bg-blue-600', text: 'text-white', grad: ['#93c5fd', '#1e40af'], ring: '#bfdbfe' },
};

// Color mapping for the teardrop location-pin token markers
const PIN_COLOR_HEX: Record<PlayerColor, { main: string; border: string }> = {
  red: { main: '#e11d48', border: '#ffe4e6' },
  green: { main: '#16a34a', border: '#dcfce7' },
  yellow: { main: '#eab308', border: '#fef9c3' },
  blue: { main: '#2563eb', border: '#dbeafe' },
};

const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: -90, y: 0 },
  2: { x: 0, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 0, y: 180 },
  6: { x: 90, y: 0 },
};

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [26, 26],
    [74, 74],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [26, 26],
    [74, 26],
    [26, 74],
    [74, 74],
  ],
  5: [
    [26, 26],
    [74, 26],
    [50, 50],
    [26, 74],
    [74, 74],
  ],
  6: [
    [26, 22],
    [74, 22],
    [26, 50],
    [74, 50],
    [26, 78],
    [74, 78],
  ],
};

const DICE_SIZE = 64; // px
const DICE_HALF = DICE_SIZE / 2;

function DiceFace({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-slate-200 border border-slate-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.15)]"
      style={{ transform, backfaceVisibility: 'hidden' }}
    >
      {PIP_LAYOUTS[value].map(([px, py], idx) => (
        <span
          key={idx}
          className={`absolute w-[9px] h-[9px] rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)] ${
            value === 1 ? 'bg-rose-600' : 'bg-slate-900'
          }`}
          style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
    </div>
  );
}

function Dice3D({ rotation, rolling }: { rotation: { x: number; y: number }; rolling: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ perspective: '700px' }}>
      <div
        className="relative"
        style={{
          width: DICE_SIZE,
          height: DICE_SIZE,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: 'transform 1.8s cubic-bezier(0.15, 0.85, 0.35, 1)',
        }}
      >
        <DiceFace value={2} transform={`rotateY(0deg) translateZ(${DICE_HALF}px)`} />
        <DiceFace value={5} transform={`rotateY(180deg) translateZ(${DICE_HALF}px)`} />
        <DiceFace value={3} transform={`rotateY(90deg) translateZ(${DICE_HALF}px)`} />
        <DiceFace value={4} transform={`rotateY(-90deg) translateZ(${DICE_HALF}px)`} />
        <DiceFace value={1} transform={`rotateX(90deg) translateZ(${DICE_HALF}px)`} />
        <DiceFace value={6} transform={`rotateX(-90deg) translateZ(${DICE_HALF}px)`} />
      </div>
      <div
        className="mt-3 rounded-full bg-black/40 blur-[2px] transition-all duration-300"
        style={{ width: rolling ? 30 : 42, height: 8, opacity: rolling ? 0.25 : 0.4 }}
      />
    </div>
  );
}

// A little randomness helper — makes timers feel human instead of mechanically fixed
const jitter = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

export default function LudoPage() {
  const { user, updateWalletBalance, updateDemoBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  const router = useRouter();
  const ENTRY_COST = 25;
  const WIN_REWARD = 44;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const handleBackToGames = (e: React.MouseEvent) => {
    if (hasPaidEntry && !winner) {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };

  const [userColor, setUserColor] = useState<PlayerColor>('red');
  const [gameMode, setGameMode] = useState<GameMode>('1v1');

  const [tokens, setTokens] = useState<Record<PlayerColor, Token[]>>({
    red: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'red', position: -1, stepCount: 0 })),
    green: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'green', position: -1, stepCount: 0 })),
    yellow: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'yellow', position: -1, stepCount: 0 })),
    blue: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'blue', position: -1, stepCount: 0 })),
  });

  const [currentTurn, setCurrentTurn] = useState<PlayerColor>('red');
  const [opponentName, setOpponentName] = useState<string>('Neha_Star');
  const [diceVal, setDiceVal] = useState<number>(6);
  const [cubeRotation, setCubeRotation] = useState<{ x: number; y: number }>(() => ({ ...FACE_ROTATIONS[6] }));
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);

  const spinCubeTo = (value: number) => {
    setCubeRotation((prev) => {
      const normX = ((prev.x % 360) + 360) % 360;
      const normY = ((prev.y % 360) + 360) % 360;
      const target = FACE_ROTATIONS[value];
      return {
        x: prev.x - normX + 1440 + target.x,
        y: prev.y - normY + 2160 + target.y,
      };
    });
  };

  const [travelingTokenId, setTravelingTokenId] = useState<{ color: PlayerColor; id: number } | null>(null);
  const [travelPath, setTravelPath] = useState<[number, number][]>([]);
  const [popupBanner, setPopupBanner] = useState<{ type: 'capture' | 'safe' | 'home'; message: string } | null>(null);

  const turnOrder: PlayerColor[] = gameMode === '1v1'
    ? [userColor, OPPOSITE_COLORS[userColor]]
    : gameMode === '1v2'
    ? [userColor, 'green', 'yellow']
    : ['red', 'green', 'yellow', 'blue'];

  const showLudoBanner = (type: 'capture' | 'safe' | 'home', message: string) => {
    setPopupBanner({ type, message });
    setTimeout(() => {
      setPopupBanner(null);
    }, 2500);
  };

  const tokensRef = useRef<Record<PlayerColor, Token[]>>(tokens);

  const updateTokensState = (newTokens: Record<PlayerColor, Token[]>) => {
    tokensRef.current = newTokens;
    setTokens(newTokens);
  };

  const handleStartMatch = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    const currentBalance = playMode === 'DEMO' ? (user?.demoBalance !== undefined ? user.demoBalance : 1000) : (user?.walletBalance || 0);
    if (currentBalance <= 0 || currentBalance < ENTRY_COST) {
      showToast(
        `Insufficient ${playMode === 'DEMO' ? 'Demo Coins' : 'Real Money'} balance! Entry fee is ${
          playMode === 'DEMO' ? formatCoins(ENTRY_COST) : `₹${ENTRY_COST}`
        }. Current balance: ${playMode === 'DEMO' ? formatCoins(currentBalance) : `₹${formatCurrency(currentBalance)}`}. Please add funds to play.`,
        'error'
      );
      return;
    }
    if (playMode === 'REAL') {
      await updateWalletBalance(-ENTRY_COST);
    } else {
      updateDemoBalance(-ENTRY_COST);
    }
    setHasPaidEntry(true);
    const freshTokens: Record<PlayerColor, Token[]> = {
      red: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'red', position: -1, stepCount: 0 })),
      green: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'green', position: -1, stepCount: 0 })),
      yellow: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'yellow', position: -1, stepCount: 0 })),
      blue: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'blue', position: -1, stepCount: 0 })),
    };
    updateTokensState(freshTokens);
    setCurrentTurn(userColor);
    setOpponentName(getRandomOpponentName());
    setDiceVal(6);
    setHasRolled(false);
    setIsOpponentThinking(false);
    setConsecutiveSixes(0);
    setWinner(null);
  };

  const getMovableTokens = (color: PlayerColor, dice: number): Token[] => {
    const list = tokensRef.current[color] || tokens[color];
    return list.filter((t) => {
      if (t.position === -1) return dice === 6;
      if (t.position === 200) return false;
      return t.stepCount + dice <= 57;
    });
  };

  // ---------- STRATEGIC OPPONENT EVALUATOR ----------
  const simulateMove = (color: PlayerColor, tok: Token, dice: number) => {
    const stepCount = tok.stepCount + dice;
    let position: number;
    if (stepCount === 57) position = 200;
    else if (stepCount > 51) position = 100 + (stepCount - 52);
    else position = (START_INDEXES[color] + (stepCount - 1)) % 52;
    return { stepCount, position };
  };

  const isPositionVulnerable = (position: number, opponents: PlayerColor[]): boolean => {
    if (position < 0 || position >= 100) return false;
    if (SAFE_INDEXES.includes(position)) return false;
    for (const oc of opponents) {
      for (const ot of tokensRef.current[oc]) {
        if (ot.position < 0 || ot.position >= 100) continue;
        const diff = (position - ot.position + 52) % 52;
        if (diff >= 1 && diff <= 6) return true;
      }
    }
    return false;
  };

  const getSmartMove = (color: PlayerColor, dice: number, movableTokens: Token[]): Token => {
    const opponents = turnOrder.filter((c) => c !== color);
    let best = movableTokens[0];
    let bestScore = -Infinity;

    for (const tok of movableTokens) {
      let score = dice;

      if (tok.position === -1) {
        const activeCount = tokensRef.current[color].filter((t) => t.position !== -1 && t.position !== 200).length;
        score += 20 - activeCount * 3;
      } else {
        const { stepCount, position } = simulateMove(color, tok, dice);
        let captured = false;

        if (position < 52 && !SAFE_INDEXES.includes(position)) {
          for (const oc of opponents) {
            const victim = tokensRef.current[oc].find((ot) => ot.position === position);
            if (victim) {
              score += 60 + victim.stepCount * 0.6;
              captured = true;
            }
          }
        }

        if (stepCount === 57) score += 130;
        else if (position >= 100) score += 26;
        else if (SAFE_INDEXES.includes(position)) score += 22;

        if (!captured) {
          const wasExposed = isPositionVulnerable(tok.position, opponents);
          const willBeExposed = isPositionVulnerable(position, opponents);
          if (willBeExposed) score -= 34;
          if (wasExposed && !willBeExposed) score += 16;
        }

        score += tok.stepCount * 0.12;
      }

      if (score > bestScore) {
        bestScore = score;
        best = tok;
      }
    }

    return best;
  };

  useEffect(() => {
    if (!hasPaidEntry || winner) return;

    if (currentTurn !== userColor) {
      setIsOpponentThinking(true);
      const timer = setTimeout(() => {
        opponentAutoPlay();
      }, jitter(1200, 2200));
      return () => clearTimeout(timer);
    }
  }, [currentTurn, hasPaidEntry, winner, userColor]);

  const opponentAutoPlay = () => {
    if (!!winner) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);
    spinCubeTo(roll);
    setTimeout(() => {
      setDiceVal(roll);
      setIsRolling(false);

      if (roll === 6) {
        const sixes = consecutiveSixes + 1;
        setConsecutiveSixes(sixes);
        if (sixes >= 3) {
          setConsecutiveSixes(0);
          setIsOpponentThinking(false);
          nextTurn();
          return;
        }
      } else {
        setConsecutiveSixes(0);
      }

      const movable = getMovableTokens(currentTurn, roll);
      if (movable.length === 0) {
        if (roll === 6) {
          setTimeout(() => opponentAutoPlay(), 600);
        } else {
          setIsOpponentThinking(false);
          nextTurn();
        }
      } else {
        const chosen = getSmartMove(currentTurn, roll, movable);
        setTimeout(() => {
          executeMoveToken(currentTurn, chosen.id, roll);
        }, jitter(250, 500));
      }
    }, 1800);
  };

  const rollDice = () => {
    if (isRolling || hasRolled || currentTurn !== userColor || !!winner || isOpponentThinking) return;

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);
    spinCubeTo(finalRoll);
    setTimeout(() => {
      setDiceVal(finalRoll);
      setIsRolling(false);
      setHasRolled(true);

      if (finalRoll === 6) {
        const sixes = consecutiveSixes + 1;
        setConsecutiveSixes(sixes);
        if (sixes >= 3) {
          setConsecutiveSixes(0);
          setHasRolled(false);
          nextTurn();
          return;
        }
      } else {
        setConsecutiveSixes(0);
      }

      const movable = getMovableTokens(userColor, finalRoll);
      if (movable.length === 1 || (finalRoll === 6 && movable.length > 0 && movable.every((t) => t.position === -1))) {
        setTimeout(() => {
          executeMoveToken(userColor, movable[0].id, finalRoll);
        }, 350);
      } else if (movable.length === 0) {
        if (finalRoll === 6) {
          setTimeout(() => setHasRolled(false), 500);
        } else {
          setTimeout(() => {
            setHasRolled(false);
            nextTurn();
          }, 600);
        }
      }
    }, 1800);
  };

  const getTokenCellCoords = (color: PlayerColor, stepCount: number, position: number): [number, number] | null => {
    if (position >= 0 && position < 52) return CIRCUIT_GRID_COORDS[position];
    if (position >= 100 && position <= 104) return HOME_STRETCH_COORDS[color][position - 100];
    return null;
  };

  const [lastMovedToken, setLastMovedToken] = useState<{ color: PlayerColor; id: number; path: number[] } | null>(null);

  const executeMoveToken = (color: PlayerColor, tokenId: number, dice: number, onComplete?: () => void) => {
    const playerTokens = tokensRef.current[color];
    const targetToken = playerTokens.find((t) => t.id === tokenId);
    if (!targetToken) return;

    setTravelingTokenId({ color, id: tokenId });

    const cloneTokens = (): Record<PlayerColor, Token[]> => ({
      red: tokensRef.current.red.map((t) => ({ ...t })),
      green: tokensRef.current.green.map((t) => ({ ...t })),
      yellow: tokensRef.current.yellow.map((t) => ({ ...t })),
      blue: tokensRef.current.blue.map((t) => ({ ...t })),
    });

    if (targetToken.position === -1) {
      if (dice !== 6) return;
      const newTokens = cloneTokens();
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.position = START_INDEXES[color];
      tok.stepCount = 1;

      updateTokensState(newTokens);
      setLastMovedToken({ color, id: tokenId, path: [START_INDEXES[color]] });
      setTravelingTokenId(null);
      setHasRolled(false);
      showLudoBanner('safe', `⭐ Token Unlocked to Start Cell!`);

      if (color !== userColor) {
        setTimeout(() => opponentAutoPlay(), 600);
      } else if (onComplete) {
        onComplete();
      }
      return;
    }

    let currentStep = targetToken.stepCount;
    const targetStep = currentStep + dice;
    if (targetStep > 57) return;

    const pathPositions: number[] = [];
    for (let s = currentStep + 1; s <= targetStep; s++) {
      if (s === 57) {
        pathPositions.push(200);
      } else if (s > 51) {
        pathPositions.push(100 + (s - 52));
      } else {
        const startIdx = START_INDEXES[color];
        pathPositions.push((startIdx + (s - 1)) % 52);
      }
    }

    setLastMovedToken({ color, id: tokenId, path: pathPositions });

    const pathCoords: [number, number][] = [];

    const moveInterval = setInterval(() => {
      currentStep += 1;
      const newTokens = cloneTokens();
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.stepCount = currentStep;

      if (currentStep === 57) {
        tok.position = 200;
        showLudoBanner('home', `🏆 Token Reached CENTER HOME!`);
      } else if (currentStep > 51) {
        tok.position = 100 + (currentStep - 52);
      } else {
        const startIdx = START_INDEXES[color];
        tok.position = (startIdx + (currentStep - 1)) % 52;
      }

      const cell = getTokenCellCoords(color, currentStep, tok.position);
      if (cell) pathCoords.push(cell);
      setTravelPath([...pathCoords]);
      updateTokensState(newTokens);

      if (currentStep >= targetStep) {
        clearInterval(moveInterval);

        let captured = false;
        if (tok.position < 100 && !SAFE_INDEXES.includes(tok.position)) {
          for (const cKey of turnOrder) {
            if (cKey !== color) {
              const enemy = newTokens[cKey].find((t) => t.position === tok.position);
              if (enemy) {
                enemy.position = -1;
                enemy.stepCount = 0;
                captured = true;
                showLudoBanner('capture', `⚔️ TOKEN CAPTURED! Extra Turn Granted!`);
                break;
              }
            }
          }
        } else if (tok.position < 100 && SAFE_INDEXES.includes(tok.position)) {
          showLudoBanner('safe', `⭐ SAFE ZONE! Token is Protected!`);
        }

        if (newTokens[color].every((t) => t.position === 200)) {
          const winnerName = color === userColor ? (user?.name || 'Player') : opponentName;
          setWinner(winnerName);
          if (color === userColor) {
            recordGameMatch('ludo', 'Ludo Star Supreme', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
            confetti({ particleCount: 150, spread: 90 });
          } else {
            recordGameMatch('ludo', 'Ludo Star Supreme', 'LOSS', ENTRY_COST, 0, opponentName);
          }
        }

        setTravelingTokenId(null);
        setTravelPath([]);
        setHasRolled(false);

        const grantExtra = dice === 6 || captured || tok.position === 200;
        if (!grantExtra) {
          setIsOpponentThinking(false);
          nextTurn();
        } else if (color !== userColor) {
          setTimeout(() => opponentAutoPlay(), 700);
        }

        if (color === userColor && onComplete) onComplete();
      }
    }, 300);
  };

  const handlePlayerTokenClick = (tokenId: number) => {
    if (!hasRolled || currentTurn !== userColor || isRolling || !!winner) return;

    const movable = getMovableTokens(userColor, diceVal);
    if (movable.some((t) => t.id === tokenId)) {
      executeMoveToken(userColor, tokenId, diceVal);
    }
  };

  const nextTurn = () => {
    const curIdx = turnOrder.indexOf(currentTurn);
    const nextCol = turnOrder[(curIdx + 1) % turnOrder.length];
    setCurrentTurn(nextCol);
    setHasRolled(false);
  };

  // ---------- 3D DICE (kept on the side panel, same interaction — just restyled) ----------
  const renderPhotorealistic3DDice = (value: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ['col-start-2 row-start-2'],
      2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
      3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
      4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
      6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    };

    return (
      <div
        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-[26px] bg-gradient-to-br from-white via-slate-100 to-slate-300 border-4 border-slate-300 shadow-[0_18px_36px_rgba(0,0,0,0.45)] p-3 grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center ${
          isRolling ? 'animate-dice-roll' : 'animate-dice-idle'
        }`}
      >
        {(dotPositions[value] || dotPositions[6]).map((posClass, idx) => (
          <div
            key={idx}
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-slate-950 shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)] ${posClass}`}
          ></div>
        ))}
      </div>
    );
  };

// ---------- TEARDROP LOCATION-PIN TOKEN MARKER, grounded to the exact center-base of its cell ----------
const renderPawn = (
  color: PlayerColor,
  isSelectable: boolean = false,
  isTraveling: boolean = false,
  scaleFactor: 'normal' | 'medium' | 'small' = 'normal',
  isBaseYard: boolean = false
) => {
  const { main, border } = PIN_COLOR_HEX[color];

  // Proportional marker sizing fitting comfortably within 1/15th grid cells without row overflow
  const sizeClasses = isBaseYard
    ? 'w-[24px] h-[30px] sm:w-[30px] sm:h-[38px]'
    : scaleFactor === 'small'
    ? 'w-[10px] h-[13px] sm:w-[13px] sm:h-[16px]'
    : scaleFactor === 'medium'
    ? 'w-[12px] h-[15px] sm:w-[16px] sm:h-[20px]'
    : 'w-[15px] h-[19px] sm:w-[20px] sm:h-[25px]';

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer transition-transform duration-150 -translate-y-[10%] ${sizeClasses}`}
      style={{ transform: isTraveling ? 'scale(1.15) translateY(-15%)' : 'none' }}
    >
      {isSelectable && (
        <div className="absolute -inset-1 rounded-full bg-emerald-400/50 blur-[3px] animate-pulse pointer-events-none" />
      )}

      {/* Grounding contact shadow centered directly under the pin's tip */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[12%] rounded-full bg-black/35 blur-[1px] pointer-events-none" />

      <svg
        viewBox="0 0 24 30"
        className="relative w-full h-full drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.3)]"
        fill="none"
      >
        <path
          d="M12 0C5.37 0 0 5.37 0 12C0 19.5 12 30 12 30C12 30 24 19.5 24 12C24 5.37 18.63 0 12 0Z"
          fill={main}
          stroke={border}
          strokeWidth="1.2"
        />
        <circle cx="12" cy="11" r="4.8" fill="#ffffff" />
      </svg>
    </div>
  );
};

  // ---------- POLISHED HOME BASE YARD WITH RECESSED SOCKETS ----------
  const renderBaseYard = (color: PlayerColor, gridClass: string) => {
    const isCurrentTurn = currentTurn === color;
    const isUserColor = color === userColor;
    const canUnlock = hasRolled && diceVal === 6 && isCurrentTurn && isUserColor;
    const theme = COLOR_THEME[color];

    return (
      <div
        className={`${gridClass} ${theme.base} relative p-2.5 sm:p-4 flex flex-col items-center justify-center border-2 border-slate-900/30`}
      >
        {/* Turn badge — clean, flat indicator with NO inner glow, white outline, or shadow overlays */}
        {isCurrentTurn && (
          <div className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white shadow-sm border border-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${theme.base} animate-pulse`} />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wide">Turn</span>
          </div>
        )}

        {/* Subtle decorative pattern for a clean surface */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        />

        {/* Inner White Sockets Courtyard */}
        <div className="w-full h-full bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.12)] border-2 border-white/70 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3.5 items-center justify-items-center relative">
          {tokens[color].map((t) => {
            const inBase = t.position === -1;
            const isSelectable = canUnlock && inBase;

            return (
              <div
                key={t.id}
                onClick={() => {
                  if (inBase && isUserColor && isCurrentTurn && hasRolled && diceVal === 6) {
                    handlePlayerTokenClick(t.id);
                  }
                }}
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center relative transition-all duration-200 ${
                  isSelectable
                    ? 'ring-4 ring-emerald-400 bg-emerald-50 scale-105 cursor-pointer shadow-lg animate-pulse'
                    : 'bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] border'
                }`}
                style={!isSelectable ? { borderColor: `${PIN_COLOR_HEX[color].main}33` } : undefined}
              >
                {inBase ? (
                  renderPawn(color, isSelectable, false, 'normal', true)
                ) : (
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-30 shadow-inner"
                    style={{ backgroundColor: PIN_COLOR_HEX[color].main }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCellTokens = (row: number, col: number) => {
    const presentTokens: Token[] = [];

    Object.values(tokens).forEach((tList) => {
      tList.forEach((t) => {
        if (t.position >= 0 && t.position < 52) {
          const [r, c] = CIRCUIT_GRID_COORDS[t.position];
          if (r === row && c === col) presentTokens.push(t);
        } else if (t.position >= 100 && t.position <= 104) {
          const [r, c] = HOME_STRETCH_COORDS[t.color][t.position - 100];
          if (r === row && c === col) presentTokens.push(t);
        }
      });
    });

    const count = presentTokens.length;
    const scaleFactor: 'normal' | 'medium' | 'small' =
      count >= 3 ? 'small' : count === 2 ? 'medium' : 'normal';

    const isTravelPathSq = travelPath.some(([r, c]) => r === row && c === col);

    return (
      <>
        {isTravelPathSq && <div className="absolute inset-0 bg-amber-400/40 animate-pulse pointer-events-none"></div>}

        {count > 0 && (
          <div
            className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none ${
              count > 1 ? 'grid grid-cols-2 grid-rows-2 place-items-center p-[1px] gap-0' : ''
            }`}
          >
            {presentTokens.map((t, i) => {
              const isTraveling = travelingTokenId && travelingTokenId.color === t.color && travelingTokenId.id === t.id;
              const movable = hasRolled && currentTurn === userColor && getMovableTokens(userColor, diceVal).some((mt) => mt.id === t.id);

              return (
                <div
                  key={`${t.color}-${t.id}-${i}`}
                  onClick={() => t.color === userColor && handlePlayerTokenClick(t.id)}
                  className="pointer-events-auto flex items-center justify-center w-full h-full"
                >
                  {renderPawn(t.color, movable, !!isTraveling, scaleFactor)}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  // Decorative entry arrows on the outer track, matching the reference board's direction cues
  const ENTRY_ARROWS: { row: number; col: number; color: PlayerColor; Icon: typeof ArrowUp }[] = [
    { row: 1, col: 7, color: 'green', Icon: ArrowDown },
    { row: 7, col: 15, color: 'yellow', Icon: ArrowLeft },
    { row: 15, col: 9, color: 'blue', Icon: ArrowUp },
    { row: 9, col: 1, color: 'red', Icon: ArrowRight },
  ];

  return (
    <ProtectedRoute>
      <style jsx global>{`
        @keyframes diceRoll {
          0% { transform: perspective(700px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1); }
          25% { transform: perspective(700px) rotateX(200deg) rotateY(80deg) rotateZ(40deg) scale(1.12); }
          50% { transform: perspective(700px) rotateX(380deg) rotateY(260deg) rotateZ(90deg) scale(0.94); }
          75% { transform: perspective(700px) rotateX(560deg) rotateY(440deg) rotateZ(140deg) scale(1.1); }
          100% { transform: perspective(700px) rotateX(720deg) rotateY(720deg) rotateZ(0deg) scale(1); }
        }
        .animate-dice-roll { animation: diceRoll 0.85s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
        @keyframes diceIdle {
          0%, 100% { transform: perspective(700px) rotateX(10deg) rotateY(-12deg); }
          50% { transform: perspective(700px) rotateX(14deg) rotateY(-6deg); }
        }
        .animate-dice-idle { animation: diceIdle 3.2s ease-in-out infinite; }

        /* ---------- Turn indicator: pure glow/opacity pulse, zero layout impact ---------- */
        @keyframes turnRingPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 18px 4px var(--turn-glow-color), 0 0 0 6px var(--turn-glow-color-soft); opacity: 1; }
          50% { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 30px 8px var(--turn-glow-color), 0 0 0 9px var(--turn-glow-color-soft); opacity: 0.85; }
        }
        .turn-ring-red { --turn-glow-color: rgba(225,29,72,0.65); --turn-glow-color-soft: rgba(225,29,72,0.18); animation: turnRingPulse 1.6s ease-in-out infinite; border-radius: inherit; }
        .turn-ring-green { --turn-glow-color: rgba(22,163,74,0.65); --turn-glow-color-soft: rgba(22,163,74,0.18); animation: turnRingPulse 1.6s ease-in-out infinite; border-radius: inherit; }
        .turn-ring-yellow { --turn-glow-color: rgba(234,179,8,0.65); --turn-glow-color-soft: rgba(234,179,8,0.18); animation: turnRingPulse 1.6s ease-in-out infinite; border-radius: inherit; }
        .turn-ring-blue { --turn-glow-color: rgba(37,99,235,0.65); --turn-glow-color-soft: rgba(37,99,235,0.18); animation: turnRingPulse 1.6s ease-in-out infinite; border-radius: inherit; }

        @keyframes turnBadgePop {
          0% { transform: translate(-50%, -4px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .turn-badge-pop { animation: turnBadgePop 0.25s ease-out; }
      `}</style>

      <div className="max-w-6xl mx-auto px-2 py-2 sm:px-4 sm:py-6">
        <Link
          href="/#games-section"
          onClick={handleBackToGames}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-3 sm:mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Back to All Games</span>
        </Link>

        {popupBanner && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-xs sm:text-sm border border-amber-400/50 shadow-2xl animate-bounce flex items-center space-x-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span>{popupBanner.message}</span>
          </div>
        )}

        <div className="glass-panel rounded-2xl sm:rounded-3xl p-3 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 sm:space-y-6">

          <div className="flex flex-row items-center justify-between gap-2 pb-3 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Live Arena</span>
              </div>
              <h1 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk'] leading-tight">
                Ludo Star Supreme
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-xs sm:text-sm">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>₹{ENTRY_COST} Entry | ₹{WIN_REWARD} Win</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Select Game Mode & Color!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Challenge real online players in 1v1, 1v2, or 1v3 Ludo arenas!
                </p>
              </div>

              {/* Mode Selector */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Match Mode:</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['1v1', '1v2', '1v3'] as GameMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGameMode(mode)}
                      className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition-all flex items-center justify-center space-x-1.5 ${
                        gameMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg scale-105'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{mode === '1v1' ? '1 vs 1 (Cross)' : mode === '1v2' ? '1 vs 2' : '1 vs 3'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Your Color:</p>
                <div className="grid grid-cols-4 gap-3">
                  {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map((color) => (
                    <button
                      key={color}
                      onClick={() => setUserColor(color)}
                      className={`py-3 px-2 rounded-2xl font-black text-xs uppercase border-2 transition-all flex flex-col items-center justify-center space-y-1 ${
                        userColor === color
                          ? 'ring-4 ring-amber-400 scale-105 border-white shadow-xl'
                          : 'opacity-70 hover:opacity-100'
                      } ${COLOR_THEME[color].base} ${COLOR_THEME[color].text}`}
                    >
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹25 & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">

              {/* Board Canvas (Phaser 2D Canvas Engine) */}
              <div className="lg:col-span-8">
                <LudoBoardCanvas
                  tokens={tokens}
                  activePlayerColor={currentTurn}
                  validTokenIds={getMovableTokens(currentTurn, diceVal).map((t: Token) => t.id)}
                  onTokenClick={(color, id) => handlePlayerTokenClick(id)}
                  lastMovedToken={lastMovedToken}
                />
              </div>

              {/* Controls Panel — Compact & Mobile Responsive (0-scroll viewport fit) */}
              <div className="lg:col-span-4 space-y-3 sm:space-y-6">
                <div className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-5 text-center">

                  {winner ? (
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-sm sm:text-base flex flex-col items-center justify-center space-y-0.5 sm:space-y-1 animate-bounce">
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 fill-current drop-shadow-md" />
                      <span>{winner} Wins Ludo Match!</span>
                      <span className="text-xs text-emerald-400">+₹{WIN_REWARD} Credited to Wallet!</span>
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-2 sm:p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span>{currentTurn.toUpperCase()} player is thinking...</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs sm:text-sm font-black text-white shadow-md">
                      <span className={`w-2.5 h-2.5 rounded-full ${COLOR_THEME[currentTurn]?.base || 'bg-emerald-500'} animate-ping`} />
                      <span className={`w-2.5 h-2.5 rounded-full ${COLOR_THEME[currentTurn]?.base || 'bg-emerald-500'} -ml-5`} />
                      <span>{currentTurn === userColor ? `Your Turn (${userColor.toUpperCase()})` : `${currentTurn.toUpperCase()} Turn`}</span>
                    </div>
                  )}

                  {/* 3D Casino Dice Container — Scaled for mobile */}
                  <div className="flex justify-center my-1 sm:my-3 transform scale-90 sm:scale-100 origin-center -my-1 sm:my-0">
                    <Dice3D rotation={cubeRotation} rolling={isRolling} />
                  </div>

                  <button
                    disabled={isRolling || hasRolled || isOpponentThinking || !!winner || currentTurn !== userColor}
                    onClick={rollDice}
                    className="w-full py-2.5 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling Dice...' : hasRolled ? 'Select Pin Marker Below' : 'Roll 🎲'}
                  </button>

                  {/* Live Match Analytics — Collapsible on mobile for 0-scroll viewport fit */}
                  <details className="group pt-2 border-t border-slate-200 dark:border-slate-800 text-left" open>
                    <summary className="flex items-center justify-between cursor-pointer py-1 select-none text-[11px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Live Analytics & Progress</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <div className="space-y-2 mt-2">
                      {turnOrder.map((color) => {
                        const isUser = color === userColor;
                        const theme = COLOR_THEME[color];
                        const pTokens = tokens[color];
                        const completed = pTokens.filter((t) => t.position === 200).length;
                        const inBase = pTokens.filter((t) => t.position === -1).length;
                        const onTrack = pTokens.filter((t) => t.position >= 0 && t.position !== 200).length;
                        const pending = 4 - completed;

                        // Win Probability calculation based on board progress
                        const totalSteps = pTokens.reduce((acc, t) => {
                          if (t.position === 200) return acc + 57;
                          if (t.position === -1) return acc + 0;
                          return acc + t.stepCount;
                        }, 0);

                        const allPlayersTotal = turnOrder.reduce((acc, c) => {
                          return acc + tokens[c].reduce((tAcc, t) => {
                            if (t.position === 200) return tAcc + 57;
                            if (t.position === -1) return tAcc + 0;
                            return tAcc + t.stepCount;
                          }, 0);
                        }, 0);

                        const baseProbability = Math.round(100 / turnOrder.length);
                        const winChance = allPlayersTotal === 0
                          ? baseProbability
                          : Math.min(96, Math.max(4, Math.round((totalSteps / allPlayersTotal) * 100)));

                        return (
                          <div
                            key={color}
                            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
                              currentTurn === color
                                ? 'bg-slate-900 text-white border-slate-700 shadow-md ring-1 ring-slate-700'
                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${theme.base}`} />
                                <span className="font-extrabold text-[11px] sm:text-xs capitalize">
                                  {isUser ? `You (${color})` : `${color.toUpperCase()}`}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-emerald-500">
                                {winChance}% Win
                              </span>
                            </div>

                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                              <div
                                className={`h-full transition-all duration-500 ${theme.base}`}
                                style={{ width: `${winChance}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>Done: <strong className="text-emerald-500">{completed}/4</strong></span>
                              <span>Pending: <strong className="text-amber-500">{pending}/4</strong></span>
                              <span className="opacity-80">{inBase} base · {onTrack} track</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>

                  {/* Compact Side-by-Side Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'NEXT_MATCH' })}
                      className="py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>New Match</span>
                    </button>

                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'LEAVE_GAME' })}
                      className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] sm:text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave Game</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

          <GameConfirmModal
            isOpen={confirmModal.isOpen}
            title={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Start Next Match?'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'Exit Active Game?'
                : 'Exit to All Games?'
            }
            message={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Are you sure you want to start the next match?'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'You are currently in an active game. Leaving now will exit the current game. Are you sure you want to leave?'
                : 'Are you sure you want to exit to All Games?'
            }
            confirmText={
              confirmModal.type === 'NEXT_MATCH'
                ? 'Yes, Start Match'
                : confirmModal.type === 'LEAVE_GAME'
                ? 'Yes, Leave Game'
                : 'Yes, Exit'
            }
            cancelText="No, Keep Playing"
            variant={confirmModal.type === 'NEXT_MATCH' ? 'warning' : 'danger'}
            onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            onConfirm={() => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              if (confirmModal.type === 'NEXT_MATCH') {
                handleStartMatch();
              } else {
                router.push('/#games-section');
              }
            }}
          />

        </div>
      </div>
    </ProtectedRoute>
  );
}
