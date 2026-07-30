'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import {
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Wallet,
  Clock,
  Volume2,
  VolumeX,
  Users,
  Copy,
  Check,
  Zap,
  Flag,
  Sparkles,
  Skull,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';

// Snakes & Ladders Map (100-cell Boustrophedon Board)
const LADDERS_MAP: Record<number, number> = {
  4: 14,
  9: 31,
  19: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 96,
};

const SNAKES_MAP: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

// 100-cell Boustrophedon Grid Coordinates [row (1..10), col (1..10)]
const getCellCoords = (cellNum: number): [number, number] => {
  if (cellNum < 1 || cellNum > 100) return [10, 1];
  const rowFromBottom = Math.floor((cellNum - 1) / 10);
  const row = 10 - rowFromBottom; // 1 at top, 10 at bottom
  const isRightToLeft = rowFromBottom % 2 === 1;
  const colInRow = (cellNum - 1) % 10;
  const col = isRightToLeft ? 10 - colInRow : colInRow + 1;
  return [row, col];
};

/* ============================================================================
 * REAL 3D DICE — an actual six-face cube built from CSS, rotated with
 * rotateX/rotateY so the correct face is genuinely facing the viewer
 * (not a flat sprite swap). Opposite faces sum to 7, like a real die.
 * ==========================================================================*/
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

/* ============================================================================
 * GAME PAWN — a glossy pin-style token instead of a stacked-div "pawn",
 * anchored by its tip to the cell so it visually "stands" on the board.
 * ==========================================================================*/
type PawnTheme = 'player' | 'opponent';

const PAWN_COLORS: Record<PawnTheme, { grad: [string, string, string]; ring: string; badge: string }> = {
  player: { grad: ['#6ee7b7', '#10b981', '#065f46'], ring: 'rgba(16,185,129,0.55)', badge: 'border-emerald-400 text-emerald-300' },
  opponent: { grad: ['#fde68a', '#f59e0b', '#92400e'], ring: 'rgba(245,158,11,0.55)', badge: 'border-amber-400 text-amber-300' },
};

function GamePawn({
  cellNum,
  theme,
  name,
  active,
  traveling,
}: {
  cellNum: number;
  theme: PawnTheme;
  name: string;
  active: boolean;
  traveling: boolean;
}) {
  const [row, col] = getCellCoords(cellNum);
  const left = (col - 0.5) * 10;
  const top = (row - 0.5) * 10;
  const c = PAWN_COLORS[theme];
  const gradId = `pawnGrad-${theme}`;
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={`absolute pointer-events-none z-40 flex flex-col items-center transition-all duration-300 ${
        traveling ? 'animate-pawn-hop' : ''
      }`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(-50%, -100%) scale(${active ? 1.12 : 1})`,
      }}
    >
      <div className={`mb-1 px-2 py-0.5 rounded-full bg-slate-950/95 font-black text-[9px] sm:text-[10px] whitespace-nowrap border shadow-lg ${c.badge}`}>
        {name}
      </div>

      <div className="relative" style={{ width: 26, height: 34 }}>
        {active && (
          <div
            className="absolute -inset-1.5 rounded-full blur-md animate-pulse"
            style={{ background: c.ring }}
          />
        )}
        <svg width="26" height="34" viewBox="0 0 26 34" className="relative drop-shadow-[0_6px_6px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={c.grad[0]} />
              <stop offset="55%" stopColor={c.grad[1]} />
              <stop offset="100%" stopColor={c.grad[2]} />
            </linearGradient>
          </defs>
          <path
            d="M13 0C5.8 0 0 5.8 0 13c0 9 13 21 13 21s13-12 13-21C26 5.8 20.2 0 13 0Z"
            fill={`url(#${gradId})`}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="0.8"
          />
          <circle cx="13" cy="13" r="7.5" fill="rgba(255,255,255,0.18)" />
          <circle cx="10.5" cy="10.5" r="2.2" fill="rgba(255,255,255,0.75)" />
          <text x="13" y="16.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b1520">
            {initial}
          </text>
        </svg>
      </div>
      <div
        className="rounded-full blur-[1.5px]"
        style={{ width: 14, height: 4, marginTop: -2, background: 'rgba(0,0,0,0.45)' }}
      />
    </div>
  );
}

export default function SnakeLadderPage() {
  const { user, updateWalletBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  const ENTRY_COST = 10;
  const WIN_REWARD = 17.6;
  const DICE_SPIN_MS = 1800;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('SNAKE-8842');
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);

  const [playerPos, setPlayerPos] = useState<number>(1);
  const [opponentPos, setOpponentPos] = useState<number>(1);
  const [opponentName, setOpponentName] = useState<string>('Amit_Roy');

  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [diceVal, setDiceVal] = useState<number>(6);
  const [cubeRotation, setCubeRotation] = useState<{ x: number; y: number }>(() => ({ ...FACE_ROTATIONS[6] }));
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [eventBanner, setEventBanner] = useState<{ type: 'snake' | 'ladder' | 'win' | 'bonus' | 'forfeit'; message: string } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [travelingPlayer, setTravelingPlayer] = useState<'player' | 'opponent' | null>(null);

  // Consecutive-6 tracking (industry-standard bonus-roll rule, see rollDice/opponentAutoTurn).
  // Refs, not state, because they must be read/updated synchronously between rolls.
  const playerSixStreakRef = useRef(0);
  const opponentSixStreakRef = useRef(0);
  const aiTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous position refs to prevent stale closure bugs on consecutive rolls
  const playerPosRef = useRef(1);
  const opponentPosRef = useRef(1);

  const updatePlayerPosition = (pos: number) => {
    playerPosRef.current = pos;
    setPlayerPos(pos);
  };

  const updateOpponentPosition = (pos: number) => {
    opponentPosRef.current = pos;
    setOpponentPos(pos);
  };

  // How long the AI "thinks" before rolling — randomized so it doesn't feel
  // like a metronome, with a touch more hesitation when it's close to winning.
  const aiThinkDelay = (pos: number) => {
    const base = 900 + Math.random() * 1100;
    const nervousness = pos >= 90 ? 400 + Math.random() * 400 : 0;
    return base + nervousness;
  };

  const scheduleOpponentTurn = () => {
    setIsOpponentThinking(true);
    if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    aiTurnTimeoutRef.current = setTimeout(() => {
      opponentAutoTurn();
    }, aiThinkDelay(opponentPos));
  };

  // Sound Synthesizer
  const playSound = (type: 'roll' | 'step' | 'ladder' | 'snake' | 'win') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'ladder') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'snake') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.55);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  const handleStartMatch = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (playMode === 'DEMO') {
      showToast('🔒 Real Money Mode Required: Switch to REAL MONEY mode in top header navbar to play paid games!', 'warning');
      return;
    }
    const currentBalance = user?.walletBalance || 0;
    if (currentBalance < ENTRY_COST) {
      showToast(`Insufficient Real Money balance! Entry fee is ₹${ENTRY_COST}. Current balance: ₹${formatCurrency(currentBalance)}.`, 'error');
      return;
    }
    if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    playerSixStreakRef.current = 0;
    opponentSixStreakRef.current = 0;
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    updatePlayerPosition(1);
    updateOpponentPosition(1);
    setOpponentName(getRandomOpponentName());
    setDiceVal(6);
    setCubeRotation({ ...FACE_ROTATIONS[6] });
    setTurn('player');
    setIsOpponentThinking(false);
    setWinner(null);
    setEventBanner(null);
    setTravelingPlayer(null);
  };

  // Triggers only on the player->opponent transition. Bonus (rolled-a-6)
  // continuations while turn stays 'opponent' are scheduled directly from
  // checkOpponentWin instead, since a same-value state change won't re-fire this.
  useEffect(() => {
    if (!hasPaidEntry || winner) return;
    if (turn === 'opponent') {
      scheduleOpponentTurn();
    }
    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, hasPaidEntry, winner]);

  useEffect(() => {
    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    };
  }, []);

  // A short "processing" pause between the dice settling and the token
  // actually setting off — real players don't move the instant the die stops.
  const MOVE_START_DELAY = 380;
  // Per-cell hop timing gets a little jitter so movement doesn't feel metronomic.
  const nextStepDelay = () => 230 + Math.random() * 110;

  // Spins the cube forward (never backward, so the animation always tumbles
  // convincingly) and lands it precisely on `value`.
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

  const opponentAutoTurn = () => {
    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);
    playSound('roll');
    spinCubeTo(finalRoll);
    setTimeout(() => {
      setDiceVal(finalRoll);
      setIsRolling(false);
      // Brief pause before the piece actually sets off, like a player
      // registering the result before moving their token.
      setTimeout(() => resolveOpponentRoll(finalRoll), MOVE_START_DELAY);
    }, DICE_SPIN_MS);
  };

  // Industry-standard six-streak rule: a 6 earns a bonus roll, but three 6s
  // in a row forfeits the move entirely (prevents an infinite bonus chain).
  const resolveOpponentRoll = (roll: number) => {
    let bonus = false;
    if (roll === 6) {
      opponentSixStreakRef.current += 1;
      if (opponentSixStreakRef.current >= 3) {
        opponentSixStreakRef.current = 0;
        setEventBanner({ type: 'forfeit', message: `${opponentName} rolled three 6s in a row — move forfeited!` });
        setTimeout(() => {
          setEventBanner(null);
          setIsOpponentThinking(false);
          setTurn('player');
        }, 900);
        return;
      }
      bonus = true;
    } else {
      opponentSixStreakRef.current = 0;
    }
    processOpponentStep(roll, bonus);
  };

  // Jittered hop movement — each cell takes a slightly different amount of
  // time to cross, so the token doesn't glide with robotic precision.
  const processOpponentStep = (roll: number, bonus: boolean) => {
    const startCell = opponentPosRef.current;
    const targetCell = startCell + roll;

    if (targetCell > 100) {
      setIsOpponentThinking(false);
      if (bonus) {
        setEventBanner({ type: 'bonus', message: `${opponentName} rolled a 6 — bonus roll!` });
        setTimeout(() => setEventBanner(null), 800);
        scheduleOpponentTurn();
      } else {
        setTurn('player');
      }
      return;
    }

    setTravelingPlayer('opponent');
    let cur = startCell;
    const hop = () => {
      cur += 1;
      updateOpponentPosition(cur);
      playSound('step');
      if (cur >= targetCell) {
        setTravelingPlayer(null);

        if (LADDERS_MAP[targetCell]) {
          const ladderTop = LADDERS_MAP[targetCell];
          playSound('ladder');
          setEventBanner({ type: 'ladder', message: `${opponentName} climbed a Ladder to cell ${ladderTop}! 🪜` });
          setTimeout(() => {
            updateOpponentPosition(ladderTop);
            setEventBanner(null);
            checkOpponentWin(ladderTop, bonus);
          }, 900);
        } else if (SNAKES_MAP[targetCell]) {
          const snakeTail = SNAKES_MAP[targetCell];
          playSound('snake');
          setEventBanner({ type: 'snake', message: `${opponentName} got bitten by a Snake to cell ${snakeTail}! 🐍` });
          setTimeout(() => {
            updateOpponentPosition(snakeTail);
            setEventBanner(null);
            checkOpponentWin(snakeTail, bonus);
          }, 900);
        } else {
          checkOpponentWin(targetCell, bonus);
        }
      } else {
        setTimeout(hop, nextStepDelay());
      }
    };
    setTimeout(hop, nextStepDelay());
  };

  const checkOpponentWin = (finalPos: number, bonus: boolean) => {
    setIsOpponentThinking(false);
    if (finalPos === 100) {
      setWinner(opponentName);
      playSound('win');
      recordGameMatch('snake-ladder', 'Snake & Ladder Supreme', 'LOSS', ENTRY_COST, 0, opponentName);
    } else if (bonus) {
      setEventBanner({ type: 'bonus', message: `${opponentName} rolled a 6 — bonus roll!` });
      setTimeout(() => setEventBanner(null), 800);
      scheduleOpponentTurn();
    } else {
      setTurn('player');
    }
  };

  const rollDice = () => {
    if (isRolling || isOpponentThinking || turn !== 'player' || !!winner) return;

    if (!user) {
      openAuthModal();
      return;
    }

    const currentBalance = playMode === 'REAL' ? (user?.walletBalance || 0) : (user?.demoBalance !== undefined ? user.demoBalance : 1000);
    if (currentBalance < ENTRY_COST) {
      alert(`Insufficient balance to play! Your current ${playMode === 'REAL' ? 'Real Money balance is ₹' + formatCurrency(user?.walletBalance) : 'Demo Coins balance is 🪙 ' + formatCoins(user?.demoBalance)}. Entry fee is ${playMode === 'REAL' ? '₹' + ENTRY_COST : ENTRY_COST + ' Demo Coins'}. Please switch mode or deposit cash.`);
      return;
    }
    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);
    playSound('roll');
    spinCubeTo(finalRoll);
    setTimeout(() => {
      setDiceVal(finalRoll);
      setIsRolling(false);
      setTimeout(() => resolvePlayerRoll(finalRoll), MOVE_START_DELAY);
    }, DICE_SPIN_MS);
  };

  const resolvePlayerRoll = (roll: number) => {
    let bonus = false;
    if (roll === 6) {
      playerSixStreakRef.current += 1;
      if (playerSixStreakRef.current >= 3) {
        playerSixStreakRef.current = 0;
        setEventBanner({ type: 'forfeit', message: 'Three 6s in a row — move forfeited!' });
        setTimeout(() => {
          setEventBanner(null);
          setTurn('opponent');
        }, 900);
        return;
      }
      bonus = true;
    } else {
      playerSixStreakRef.current = 0;
    }
    processPlayerStep(roll, bonus);
  };

  // Parabolic Hop Movement Flow (300ms step latency)
  const processPlayerStep = (roll: number, bonus: boolean) => {
    const startCell = playerPosRef.current;
    const targetCell = startCell + roll;

    if (targetCell > 100) {
      // Overshoot: the move is void (exact count required to finish), but a
      // 6 still earns its bonus roll regardless of whether the move landed.
      if (bonus) {
        setEventBanner({ type: 'bonus', message: 'Rolled a 6 — bonus roll! Roll again.' });
        setTimeout(() => setEventBanner(null), 800);
      } else {
        setTurn('opponent');
      }
      return;
    }

    setTravelingPlayer('player');
    let cur = startCell;
    const hop = () => {
      cur += 1;
      updatePlayerPosition(cur);
      playSound('step');

      if (cur >= targetCell) {
        setTravelingPlayer(null);

        if (LADDERS_MAP[targetCell]) {
          const ladderTop = LADDERS_MAP[targetCell];
          playSound('ladder');
          setEventBanner({ type: 'ladder', message: `GREAT MOVE! Climbed a Ladder to cell ${ladderTop}! 🪜` });
          setTimeout(() => {
            updatePlayerPosition(ladderTop);
            setEventBanner(null);
            checkPlayerWin(ladderTop, bonus);
          }, 900);
        } else if (SNAKES_MAP[targetCell]) {
          const snakeTail = SNAKES_MAP[targetCell];
          playSound('snake');
          setEventBanner({ type: 'snake', message: `OOPS! Bitten by a Snake to cell ${snakeTail}! 🐍` });
          setTimeout(() => {
            updatePlayerPosition(snakeTail);
            setEventBanner(null);
            checkPlayerWin(snakeTail, bonus);
          }, 900);
        } else {
          checkPlayerWin(targetCell, bonus);
        }
      } else {
        setTimeout(hop, nextStepDelay());
      }
    };
    setTimeout(hop, nextStepDelay());
  };

  const checkPlayerWin = async (finalPos: number, bonus: boolean) => {
    if (finalPos === 100) {
      const winnerName = user?.name || 'Player';
      setWinner(winnerName);
      playSound('win');
      await updateWalletBalance(WIN_REWARD);
      await recordGameMatch('snake-ladder', 'Snake & Ladder Supreme', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
      confetti({ particleCount: 150, spread: 90 });
    } else if (bonus) {
      setEventBanner({ type: 'bonus', message: 'Rolled a 6 — bonus roll! Roll again.' });
      setTimeout(() => setEventBanner(null), 800);
      // turn stays 'player' — the Roll button re-enables automatically
    } else {
      setTurn('opponent');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedRoomCode(true);
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  // REALISTIC 3D WOODEN LADDER ENGINE (Depth Gradient Rails + Metallic Brackets + Textured Rungs)
  const renderSVGLadder = (startCell: number, endCell: number, key: string) => {
    const [r1, c1] = getCellCoords(startCell);
    const [r2, c2] = getCellCoords(endCell);

    const x1 = (c1 - 0.5) * 10;
    const y1 = (r1 - 0.5) * 10;
    const x2 = (c2 - 0.5) * 10;
    const y2 = (r2 - 0.5) * 10;

    const numRungs = 6;
    const rungs = Array.from({ length: numRungs }, (_, i) => {
      const t = (i + 1) / (numRungs + 1);
      return {
        rx: x1 + (x2 - x1) * t,
        ry: y1 + (y2 - y1) * t,
      };
    });

    return (
      <g key={key}>
        {/* 3D Drop Shadow */}
        <line x1={x1 - 1.2} y1={y1 + 1.2} x2={x2 - 1.2} y2={y2 + 1.2} stroke="rgba(0,0,0,0.4)" strokeWidth="3" strokeLinecap="round" />
        <line x1={x1 + 1.2} y1={y1 + 1.2} x2={x2 + 1.2} y2={y2 + 1.2} stroke="rgba(0,0,0,0.4)" strokeWidth="3" strokeLinecap="round" />

        {/* 3D Wooden Rails with Gradient Tone */}
        <line x1={x1 - 1.4} y1={y1} x2={x2 - 1.4} y2={y2} stroke="#5c2c06" strokeWidth="2.8" strokeLinecap="round" />
        <line x1={x1 - 1.0} y1={y1} x2={x2 - 1.0} y2={y2} stroke="#a75d1d" strokeWidth="1.6" strokeLinecap="round" />

        <line x1={x1 + 1.0} y1={y1} x2={x2 + 1.0} y2={y2} stroke="#5c2c06" strokeWidth="2.8" strokeLinecap="round" />
        <line x1={x1 + 1.4} y1={y1} x2={x2 + 1.4} y2={y2} stroke="#a75d1d" strokeWidth="1.6" strokeLinecap="round" />

        {/* 3D Wood Rungs with Metallic Bracket Rivets */}
        {rungs.map((r, idx) => (
          <g key={idx}>
            <line x1={r.rx - 2.4} y1={r.ry + 0.3} x2={r.rx + 2.4} y2={r.ry + 0.3} stroke="rgba(0,0,0,0.3)" strokeWidth="2.2" strokeLinecap="round" />
            <line x1={r.rx - 2.4} y1={r.ry} x2={r.rx + 2.4} y2={r.ry} stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <line x1={r.rx - 2.4} y1={r.ry - 0.3} x2={r.rx + 2.4} y2={r.ry - 0.3} stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
            {/* Metallic Rivets */}
            <circle cx={r.rx - 1.4} cy={r.ry} r="0.4" fill="#334155" />
            <circle cx={r.rx + 1.4} cy={r.ry} r="0.4" fill="#334155" />
          </g>
        ))}
      </g>
    );
  };

  // REALISTIC 3D COBRA SNAKE ENGINE (Tapered Coiled Body + Coral Python Scales + Cobra Hood & Tongue!)
  const renderSVGSnake = (headCell: number, tailCell: number, key: string) => {
    const [r1, c1] = getCellCoords(headCell);
    const [r2, c2] = getCellCoords(tailCell);

    const x1 = (c1 - 0.5) * 10;
    const y1 = (r1 - 0.5) * 10;
    const x2 = (c2 - 0.5) * 10;
    const y2 = (r2 - 0.5) * 10;

    const midX = (x1 + x2) / 2 + (c1 > c2 ? 11 : -11);
    const midY = (y1 + y2) / 2;

    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

    return (
      <g key={key}>
        {/* Real 3D Drop Shadow */}
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="5" strokeLinecap="round" transform="translate(0.8, 1)" />

        {/* Tapered Outer Dark Emerald Python Spine */}
        <path d={pathD} fill="none" stroke="#064e3b" strokeWidth="4.2" strokeLinecap="round" />

        {/* Vibrant Emerald Main Body */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

        {/* Diamond Python Skin Pattern */}
        <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.5 2.5" />
        <path d={pathD} fill="none" stroke="#34d399" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1 3" />

        {/* Realistic Cobra Hood & Head */}
        <g transform={`translate(${x1}, ${y1})`}>
          {/* Red Flicking Tongue */}
          <path d="M 0 0 L -0.5 -2.5 M 0 0 L 0.5 -2.5" stroke="#ef4444" strokeWidth="0.6" fill="none" />

          {/* Cobra Head Oval */}
          <ellipse cx="0" cy="0" rx="2.5" ry="2.8" fill="#047857" stroke="#ffffff" strokeWidth="0.6" />
          <ellipse cx="0" cy="0" rx="1.8" ry="2.0" fill="#065f46" />

          {/* Eyes with Slit Pupils */}
          <circle cx="-1.0" cy="-0.8" r="0.6" fill="#fbbf24" />
          <circle cx="-1.0" cy="-0.8" r="0.3" fill="#000000" />

          <circle cx="1.0" cy="-0.8" r="0.6" fill="#fbbf24" />
          <circle cx="1.0" cy="-0.8" r="0.3" fill="#000000" />
        </g>
      </g>
    );
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        {eventBanner && (
          <div
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-sm border shadow-2xl animate-bounce flex items-center space-x-2 ${
              eventBanner.type === 'forfeit'
                ? 'border-rose-400/50'
                : eventBanner.type === 'bonus'
                ? 'border-emerald-400/50'
                : 'border-amber-400/50'
            }`}
          >
            {eventBanner.type === 'forfeit' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : eventBanner.type === 'bonus' ? (
              <Sparkles className="w-5 h-5 text-emerald-400" />
            ) : (
              <Zap className="w-5 h-5 text-amber-400" />
            )}
            <span>{eventBanner.message}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Live 3D Dice Game</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">Snake & Ladder Supreme</h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry: ₹{ENTRY_COST} | Win: ₹{WIN_REWARD}</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 text-white flex items-center justify-center shadow-xl">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Race to Cell 100!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹10 entry to challenge <span className="font-bold text-emerald-500">{opponentName}</span>. First to reach cell 100 wins ₹18!
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 max-w-xs mx-auto p-2 rounded-2xl bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Room Code: {roomCode}</span>
                <button onClick={copyRoomCode} className="ml-2 text-emerald-500 hover:text-emerald-400">
                  {copiedRoomCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹10 & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* 100-Tile Board Canvas */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="relative w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] p-2 sm:p-3 rounded-[28px] shadow-2xl select-none bg-gradient-to-br from-[#7a4a24] to-[#4a2c14]">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden border border-black/30">
                    {/* LAYER 1: WOOD & CREAM 100-TILE BOARD GRID (z-0) */}
                    <div className="w-full h-full grid grid-cols-10 grid-rows-10">
                      {Array.from({ length: 100 }, (_, i) => {
                        const cellNum = 100 - i;
                        const [row, col] = getCellCoords(cellNum);
                        const isLight = (row + col) % 2 === 0;
                        const isLadderStart = LADDERS_MAP[cellNum] !== undefined;
                        const isSnakeHead = SNAKES_MAP[cellNum] !== undefined;
                        const isStart = cellNum === 1;
                        const isFinish = cellNum === 100;

                        let tileBg = isLight ? 'bg-[#f1dcae]' : 'bg-[#e2c48a]';
                        if (isLadderStart) tileBg = isLight ? 'bg-[#cdeede]' : 'bg-[#b9e4cc]';
                        if (isSnakeHead) tileBg = isLight ? 'bg-[#f6d2ce]' : 'bg-[#f0bcb6]';
                        if (isFinish) tileBg = 'bg-gradient-to-br from-amber-300 to-amber-500';

                        return (
                          <div
                            key={cellNum}
                            className={`relative border border-black/10 flex items-start justify-start p-0.5 sm:p-1 ${tileBg} shadow-[inset_0_0_4px_rgba(0,0,0,0.15)]`}
                            style={{ gridRowStart: row, gridColumnStart: col }}
                          >
                            <span className="text-[7px] sm:text-[9px] font-black text-[#5c3a1e]/70 leading-none">{cellNum}</span>
                            {isLadderStart && <Sparkles className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 text-emerald-700/70" />}
                            {isSnakeHead && <Skull className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 text-rose-800/70" />}
                            {isStart && (
                              <span className="absolute bottom-0.5 left-0.5 text-[6px] sm:text-[7px] font-black text-emerald-800 tracking-wide">
                                START
                              </span>
                            )}
                            {isFinish && <Flag className="absolute bottom-0.5 right-0.5 w-3 h-3 text-amber-900" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* LAYER 2: VISUAL SVG OVERLAY CANVAS FOR SNAKES & LADDERS (z-10) */}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                      {Object.entries(LADDERS_MAP).map(([start, end]) => renderSVGLadder(Number(start), Number(end), `ladder-${start}`))}
                      {Object.entries(SNAKES_MAP).map(([head, tail]) => renderSVGSnake(Number(head), Number(tail), `snake-${head}`))}
                    </svg>

                    {/* LAYER 3: PIN-STYLE GAME PAWNS (z-40 -> ALWAYS ON TOP) */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none z-40">
                      <GamePawn cellNum={playerPos} theme="player" name={user?.name || 'You'} active={turn === 'player'} traveling={travelingPlayer === 'player'} />
                      <GamePawn cellNum={opponentPos} theme="opponent" name={opponentName} active={turn === 'opponent'} traveling={travelingPlayer === 'opponent'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls & Real 3D Dice */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6 text-center">
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 animate-bounce">
                      <Trophy className="w-8 h-8 text-amber-400 fill-current drop-shadow-md" />
                      <span>{winner} Reached Cell 100!</span>
                      {winner !== opponentName ? (
                        <span className="text-xs text-emerald-400">+₹{WIN_REWARD} Credited to Wallet!</span>
                      ) : (
                        <span className="text-xs text-rose-400">Better luck next match!</span>
                      )}
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} is rolling...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>Turn State</span>
                        <span className="text-emerald-500">Live Room</span>
                      </div>
                      <p className="text-lg font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                        {turn === 'player' ? `Your Turn (${user?.name || 'You'})` : `${opponentName}'s Turn`}
                      </p>
                    </div>
                  )}

                  {/* Real 3D Dice */}
                  <div className="flex justify-center my-4">
                    <Dice3D rotation={cubeRotation} rolling={isRolling} />
                  </div>

                  <button
                    disabled={isRolling || isOpponentThinking || !!winner || turn !== 'player'}
                    onClick={rollDice}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                  >
                    {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
                  </button>

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹10 Stake)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pawnHop {
          0% {
            transform: translate(-50%, -100%) scale(1) translateY(0);
          }
          35% {
            transform: translate(-50%, -100%) scale(1.08) translateY(-10px);
          }
          70% {
            transform: translate(-50%, -100%) scale(0.97) translateY(0);
          }
          100% {
            transform: translate(-50%, -100%) scale(1) translateY(0);
          }
        }
        .animate-pawn-hop {
          animation: pawnHop 0.3s ease-in-out infinite;
        }
      `}</style>
    </ProtectedRoute>
  );
}
