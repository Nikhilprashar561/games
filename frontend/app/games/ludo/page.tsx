'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCcw,
  Wallet,
  Clock,
  Star,
  Sparkles,
  Crown,
  Users,
  Zap,
  Brain,
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

// Color mapping for Teardrop Location Pin Markers
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
  const { user, updateWalletBalance, recordGameMatch } = useAuth();
  const ENTRY_COST = 25;
  const WIN_REWARD = 45;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
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
  const [winner, setWinner] = useState<string | null>(null);

  const [travelingTokenId, setTravelingTokenId] = useState<{ color: PlayerColor; id: number } | null>(null);
  const [travelPath, setTravelPath] = useState<[number, number][]>([]);
  const [popupBanner, setPopupBanner] = useState<{ type: 'capture' | 'safe' | 'home'; message: string } | null>(null);
  const [turnTimer, setTurnTimer] = useState<number>(15);

  const turnOrder: PlayerColor[] = gameMode === '1v1'
    ? [userColor, OPPOSITE_COLORS[userColor]]
    : gameMode === '1v2'
    ? [userColor, 'green', 'yellow']
    : ['red', 'green', 'yellow', 'blue'];

  const showToast = (type: 'capture' | 'safe' | 'home', message: string) => {
    setPopupBanner({ type, message });
    setTimeout(() => {
      setPopupBanner(null);
    }, 2500);
  };

  useEffect(() => {
    if (!hasPaidEntry || winner) return;

    const timer = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          nextTurn();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, hasPaidEntry, winner]);

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Ludo match.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setTokens({
      red: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'red', position: -1, stepCount: 0 })),
      green: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'green', position: -1, stepCount: 0 })),
      yellow: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'yellow', position: -1, stepCount: 0 })),
      blue: Array.from({ length: 4 }, (_, i) => ({ id: i, color: 'blue', position: -1, stepCount: 0 })),
    });
    setCurrentTurn(userColor);
    setOpponentName(getRandomOpponentName());
    setDiceVal(6);
    setHasRolled(false);
    setIsOpponentThinking(false);
    setConsecutiveSixes(0);
    setWinner(null);
    setTurnTimer(15);
  };

  const getMovableTokens = (color: PlayerColor, dice: number): Token[] => {
    return tokens[color].filter((t) => {
      if (t.position === -1) return dice === 6;
      if (t.position === 200) return false;
      return t.stepCount + dice <= 57;
    });
  };

  // ---------- SMARTER OPPONENT BRAIN ----------
  // Instead of a fixed priority list, every legal move is scored on several
  // strategic factors and the opponent picks whichever move has the best
  // expected outcome — closer to how a thinking player would decide.

  const simulateMove = (color: PlayerColor, tok: Token, dice: number) => {
    const stepCount = tok.stepCount + dice;
    let position: number;
    if (stepCount === 57) position = 200;
    else if (stepCount > 51) position = 100 + (stepCount - 52);
    else position = (START_INDEXES[color] + (stepCount - 1)) % 52;
    return { stepCount, position };
  };

  // Is a circuit cell within striking distance (1-6) of any enemy token?
  const isPositionVulnerable = (position: number, opponents: PlayerColor[]): boolean => {
    if (position < 0 || position >= 100) return false; // home stretch / base / finished = untouchable
    if (SAFE_INDEXES.includes(position)) return false;
    for (const oc of opponents) {
      for (const ot of tokens[oc]) {
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
      let score = dice; // baseline: raw progress made

      if (tok.position === -1) {
        // Bringing a fresh token into play — valuable early, less so if board is crowded
        const activeCount = tokens[color].filter((t) => t.position !== -1 && t.position !== 200).length;
        score += 20 - activeCount * 3;
      } else {
        const { stepCount, position } = simulateMove(color, tok, dice);
        let captured = false;

        if (position < 52 && !SAFE_INDEXES.includes(position)) {
          for (const oc of opponents) {
            const victim = tokens[oc].find((ot) => ot.position === position);
            if (victim) {
              score += 60 + victim.stepCount * 0.6; // reward capturing advanced enemies most
              captured = true;
            }
          }
        }

        if (stepCount === 57) score += 130; // finishing a token is huge
        else if (position >= 100) score += 26; // entering the safe home stretch
        else if (SAFE_INDEXES.includes(position)) score += 22; // landing on a star cell

        if (!captured) {
          const wasExposed = isPositionVulnerable(tok.position, opponents);
          const willBeExposed = isPositionVulnerable(position, opponents);
          if (willBeExposed) score -= 34; // don't walk into danger
          if (wasExposed && !willBeExposed) score += 16; // reward escaping danger
        }

        score += tok.stepCount * 0.12; // mild preference for pushing the lead token home
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
      // Randomized "thinking" delay so the AI doesn't feel mechanically instant
      const timer = setTimeout(() => {
        opponentAutoPlay();
      }, jitter(1300, 2600));
      return () => clearTimeout(timer);
    }
  }, [currentTurn, hasPaidEntry, winner, userColor]);

  const opponentAutoPlay = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);
    spinCubeTo(roll);
    setTimeout(() => {
      setDiceVal(roll);
      setIsRolling(false);

      const movable = getMovableTokens(currentTurn, roll);
      if (movable.length === 0) {
        if (roll === 6) {
          // Bonus roll for 6 even if no token could move
          setTimeout(opponentAutoPlay, 500);
        } else {
          setIsOpponentThinking(false);
          nextTurn();
        }
      } else {
        const chosen = getSmartMove(currentTurn, roll, movable);
        setTimeout(() => {
          executeMoveToken(currentTurn, chosen.id, roll, () => {
            setIsOpponentThinking(false);
          });
        }, jitter(250, 550));
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
      if (movable.length === 1 && finalRoll === 6 && tokens[userColor].every((t) => t.position === -1)) {
        // Auto-unlock first token from base on rolling 6 for smooth gameplay!
        setTimeout(() => {
          executeMoveToken(userColor, movable[0].id, 6);
        }, 400);
      } else if (movable.length === 0) {
        if (finalRoll === 6) {
          // Reset hasRolled so player can roll their bonus 6 turn!
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

  const executeMoveToken = (color: PlayerColor, tokenId: number, dice: number, onComplete?: () => void) => {
    const playerTokens = tokens[color];
    const targetToken = playerTokens.find((t) => t.id === tokenId);
    if (!targetToken) return;

    setTravelingTokenId({ color, id: tokenId });

    // Deep-clone tokens to guarantee React detects state changes & re-renders immediately
    const cloneTokens = (): Record<PlayerColor, Token[]> => ({
      red: tokens.red.map((t) => ({ ...t })),
      green: tokens.green.map((t) => ({ ...t })),
      yellow: tokens.yellow.map((t) => ({ ...t })),
      blue: tokens.blue.map((t) => ({ ...t })),
    });

    if (targetToken.position === -1) {
      if (dice !== 6) return;
      const newTokens = cloneTokens();
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.position = START_INDEXES[color];
      tok.stepCount = 1;

      setTokens(newTokens);
      setTravelingTokenId(null);
      setHasRolled(false);
      showToast('safe', `⭐ Token Unlocked to Start Cell!`);
      if (onComplete) onComplete();
      return;
    }

    let currentStep = targetToken.stepCount;
    const targetStep = currentStep + dice;
    if (targetStep > 57) return;

    const pathCoords: [number, number][] = [];

    const moveInterval = setInterval(() => {
      currentStep += 1;
      const newTokens = cloneTokens();
      const tok = newTokens[color].find((t) => t.id === tokenId)!;
      tok.stepCount = currentStep;

      if (currentStep === 57) {
        tok.position = 200;
        showToast('home', `🏆 Token Reached CENTER HOME!`);
      } else if (currentStep > 51) {
        tok.position = 100 + (currentStep - 52);
      } else {
        const startIdx = START_INDEXES[color];
        tok.position = (startIdx + (currentStep - 1)) % 52;
      }

      const cell = getTokenCellCoords(color, currentStep, tok.position);
      if (cell) pathCoords.push(cell);
      setTravelPath([...pathCoords]);
      setTokens(newTokens);

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
                showToast('capture', `⚔️ TOKEN CAPTURED! Extra Turn Granted!`);
                break;
              }
            }
          }
        } else if (tok.position < 100 && SAFE_INDEXES.includes(tok.position)) {
          showToast('safe', `⭐ SAFE ZONE! Token is Protected!`);
        }

        if (newTokens[color].every((t) => t.position === 200)) {
          const winnerName = color === userColor ? (user?.name || 'Player') : opponentName;
          setWinner(winnerName);
          if (color === userColor) {
            updateWalletBalance(WIN_REWARD);
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
          nextTurn();
        }

        if (onComplete) onComplete();
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
    setTurnTimer(15);
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

// ---------- TEARDROP LOCATION PIN MARKER (Dead-Center Aligned) ----------
const renderPawn = (
  color: PlayerColor,
  isSelectable: boolean = false,
  isTraveling: boolean = false,
  scaleFactor: 'normal' | 'medium' | 'small' = 'normal'
) => {
  const { main, border } = PIN_COLOR_HEX[color];

  // Fixed size classes to prevent height/width distortion or layout shifts
  const sizeClasses =
    scaleFactor === 'small'
      ? 'w-3.5 h-4.5 sm:w-4 sm:h-5'
      : scaleFactor === 'medium'
      ? 'w-4.5 h-5.5 sm:w-5 sm:h-6'
      : 'w-6 h-7 sm:w-7 sm:h-8';

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer transition-opacity duration-150 ${sizeClasses}`}
    >
      {isSelectable && (
        <div className="absolute -inset-1 rounded-full bg-emerald-400/60 blur-[3px] animate-pulse pointer-events-none" />
      )}

      {/* Exact Teardrop Location Pin SVG with Center Alignment */}
      <svg
        viewBox="0 0 24 30"
        className="w-full h-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 0C5.37 0 0 5.37 0 12C0 19.5 12 30 12 30C12 30 24 19.5 24 12C24 5.37 18.63 0 12 0Z"
          fill={main}
          stroke={border}
          strokeWidth="1.2"
        />
        {/* Hollow White Center Circle Head */}
        <circle cx="12" cy="11" r="5" fill="#ffffff" />
      </svg>
    </div>
  );
};

  // ---------- POLISHED HOME BASE YARD WITH RECESSED SOCKETS ----------
  const renderBaseYard = (color: PlayerColor, gridClass: string) => {
    const isCurrentTurn = currentTurn === color;
    const isUserColor = color === userColor;
    const canUnlock = hasRolled && diceVal === 6 && isCurrentTurn && isUserColor;

    return (
      <div
        className={`${gridClass} ${COLOR_THEME[color].base} p-2.5 sm:p-4 flex flex-col items-center justify-center transition-all ${
          isCurrentTurn
            ? 'shadow-[0_0_30px_rgba(255,255,255,0.8)] scale-[1.03] z-10 border-2 border-white'
            : 'border-2 border-slate-900/40 opacity-95'
        }`}
      >
        {/* Inner White Sockets Courtyard */}
        <div className="w-full h-full bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-[inset_0_3px_8px_rgba(0,0,0,0.18)] border-2 border-slate-300/80 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 items-center justify-items-center relative">
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
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center relative transition-all ${
                  isSelectable
                    ? 'ring-4 ring-emerald-400 bg-emerald-50 scale-105 cursor-pointer shadow-lg animate-pulse'
                    : 'bg-slate-200/90 shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)] border border-slate-300'
                }`}
              >
                {inBase ? (
                  renderPawn(color, isSelectable, false, 'normal')
                ) : (
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-40 shadow-inner"
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
              count > 1 ? 'grid grid-cols-2 grid-rows-2 p-0.5 gap-0.5' : ''
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
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        {popupBanner && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-sm border border-amber-400/50 shadow-2xl animate-bounce flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{popupBanner.message}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <Brain className="w-3.5 h-3.5" />
                <span>Smart Online Opponent</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Ludo Star Supreme
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry: ₹{ENTRY_COST} | Win: ₹{WIN_REWARD}</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Select Game Mode & Color!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Challenge intelligent online opponents in 1v1, 1v2, or 1v3 Ludo arenas!
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Board Canvas */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] border-4 border-slate-900 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-15 grid-rows-15 bg-[#fafafa] select-none relative">

                  {/* RED BASE YARD */}
                  {renderBaseYard('red', 'col-span-6 row-span-6 border-b-2 border-r-2 border-slate-900')}

                  {/* GREEN BASE YARD */}
                  {renderBaseYard('green', 'col-start-10 col-span-6 row-span-6 border-b-2 border-l-2 border-slate-900')}

                  {/* BLUE BASE YARD */}
                  {renderBaseYard('blue', 'row-start-10 col-span-6 row-span-6 border-t-2 border-r-2 border-slate-900')}

                  {/* YELLOW BASE YARD */}
                  {renderBaseYard('yellow', 'row-start-10 col-start-10 col-span-6 row-span-6 border-t-2 border-l-2 border-slate-900')}

                  {/* CENTER HOME — four color wedges meeting in the middle, like the reference board */}
                  <div
                    className="col-start-7 row-start-7 col-span-3 row-span-3 flex flex-col items-center justify-center border-2 border-slate-900 shadow-2xl z-10 relative overflow-hidden"
                    style={{
                      background: 'conic-gradient(from -45deg, #16a34a 0deg 90deg, #f59e0b 90deg 180deg, #2563eb 180deg 270deg, #e11d48 270deg 360deg)',
                    }}
                  >
                    {winner ? (
                      <div className="flex flex-col items-center animate-bounce bg-white/90 rounded-xl px-2 py-1">
                        <Crown className="w-7 h-7 text-amber-500 fill-current drop-shadow-md" />
                        <span className="text-[9px] font-black uppercase text-slate-950">WINNER</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center bg-white/85 rounded-full w-8 h-8 sm:w-10 sm:h-10 items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-slate-950 animate-bounce" />
                      </div>
                    )}
                  </div>

                  {/* 15x15 GRID CELLS */}
                  {Array.from({ length: 15 }, (_, r) =>
                    Array.from({ length: 15 }, (_, c) => {
                      const row = r + 1;
                      const col = c + 1;

                      if (
                        (row <= 6 && col <= 6) ||
                        (row <= 6 && col >= 10) ||
                        (row >= 10 && col <= 6) ||
                        (row >= 10 && col >= 10) ||
                        (row >= 7 && row <= 9 && col >= 7 && col <= 9)
                      ) {
                        return null;
                      }

                      const isRedHomeStr = row === 8 && col >= 2 && col <= 6;
                      const isGreenHomeStr = col === 8 && row >= 2 && row <= 6;
                      const isYellowHomeStr = row === 8 && col >= 10 && col <= 14;
                      const isBlueHomeStr = col === 8 && row >= 10 && row <= 14;

                      const isRedStart = row === 7 && col === 2;
                      const isGreenStart = row === 2 && col === 9;
                      const isYellowStart = row === 9 && col === 14;
                      const isBlueStart = row === 14 && col === 7;

                      const isStarCell =
                        (row === 3 && col === 7) ||
                        (row === 13 && col === 9) ||
                        (row === 9 && col === 3) ||
                        (row === 7 && col === 13);

                      const arrow = ENTRY_ARROWS.find((a) => a.row === row && a.col === col);

                      return (
                        <div
                          key={`cell-${row}-${col}`}
                          className={`relative border border-slate-300 dark:border-slate-300 flex items-center justify-center font-bold text-[9px] ${
                            isRedHomeStr || isRedStart
                              ? `${COLOR_THEME.red.tile} text-white shadow-sm`
                              : isGreenHomeStr || isGreenStart
                              ? `${COLOR_THEME.green.tile} text-white shadow-sm`
                              : isYellowHomeStr || isYellowStart
                              ? `${COLOR_THEME.yellow.tile} text-slate-950 shadow-sm`
                              : isBlueHomeStr || isBlueStart
                              ? `${COLOR_THEME.blue.tile} text-white shadow-sm`
                              : 'bg-white text-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
                          }`}
                          style={{ gridRowStart: row, gridColumnStart: col }}
                        >
                          {isStarCell && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                          {arrow && (
                            <arrow.Icon
                              className="w-3 h-3 opacity-90"
                              style={{ color: arrow.color === 'yellow' ? '#78350f' : 'white' }}
                            />
                          )}
                          {renderCellTokens(row, col)}
                        </div>
                      );
                    })
                  )}

                </div>
              </div>

              {/* Controls Panel — dice stays here untouched in position/behavior, just restyled */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6 text-center">

                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 animate-bounce">
                      <Crown className="w-8 h-8 text-amber-400 fill-current drop-shadow-md" />
                      <span>{winner} Wins Ludo Match!</span>
                      <span className="text-xs text-emerald-400">+₹{WIN_REWARD} Credited to Wallet!</span>
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{currentTurn.toUpperCase()} player evaluating strategy...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>Turn Player</span>
                        <span>Timer: {turnTimer}s</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                        {currentTurn === userColor ? `Your Turn (${userColor.toUpperCase()})` : `${currentTurn.toUpperCase()} Turn`}
                      </p>
                    </div>
                  )}

                  {/* Exact 3D Casino Dice (Same as Snake & Ladder) */}
                  <div className="flex justify-center my-4">
                    <Dice3D rotation={cubeRotation} rolling={isRolling} />
                  </div>

                  <button
                    disabled={isRolling || hasRolled || isOpponentThinking || !!winner || currentTurn !== userColor}
                    onClick={rollDice}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling Dice...' : hasRolled ? 'Select Pin Marker Below' : 'Roll 3D Casino Dice 🎲'}
                  </button>

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹25 Stake)</span>
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
