'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, ShieldCheck, Trophy, Wallet, RotateCcw, Target, Clock, Crown, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

/* ============================================================================
 * GEOMETRY — logical canvas is a fixed 640x640 coordinate space, scaled to
 * whatever pixel size the browser renders it at (see canvas setup below).
 * ==========================================================================*/
const LOGICAL_SIZE = 640;
const FRAME = 34;
const PLAY_MIN = FRAME;
const PLAY_MAX = LOGICAL_SIZE - FRAME;
const CENTER = LOGICAL_SIZE / 2;
const POCKET_R = 24;
const POCKET_INSET = 34;
const POCKETS: { x: number; y: number }[] = [
  { x: PLAY_MIN + POCKET_INSET, y: PLAY_MIN + POCKET_INSET },
  { x: PLAY_MAX - POCKET_INSET, y: PLAY_MIN + POCKET_INSET },
  { x: PLAY_MIN + POCKET_INSET, y: PLAY_MAX - POCKET_INSET },
  { x: PLAY_MAX - POCKET_INSET, y: PLAY_MAX - POCKET_INSET },
];
const COIN_R = 15;
const STRIKER_R = 19;
const BASELINE_PLAYER_Y = PLAY_MAX - 58;
const BASELINE_AI_Y = PLAY_MIN + 58;
const BASELINE_MIN_X = CENTER - 130;
const BASELINE_MAX_X = CENTER + 130;
// Mirrors of the player/AI baselines on the left & right edges — drawn purely
// for visual fidelity with a real board (gameplay only ever uses the
// top/bottom lines, so nothing about scoring or striker placement changes).
const LEFT_BASELINE_X = PLAY_MIN + 58;
const RIGHT_BASELINE_X = PLAY_MAX - 58;

/* ============================================================================
 * PHYSICS TUNING
 * ==========================================================================*/
const FRICTION = 0.983;
const MIN_SPEED = 0.06;
const WALL_RESTITUTION = 0.74;
const COIN_RESTITUTION = 0.92;
const MAX_SHOT_SPEED = 24;
const MIN_SHOT_SPEED = 3;
const MAX_DRAG_PX = 120;
const MAX_SIM_FRAMES = 420; // safety cap (~7s @ 60fps) so a physics edge-case can never hang the game

/* ============================================================================
 * GAME RULES CONSTANTS
 * ==========================================================================*/
const ENTRY_COST = 20;
const WIN_REWARD = 36;
const WIN_SCORE = 50;
const COIN_POINTS = 10;
const QUEEN_POINTS = 50;
const FOUL_PENALTY = 5;

type PieceKind = 'white' | 'black' | 'queen' | 'striker';
type Turn = 'player' | 'ai';

interface Piece {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: PieceKind;
  potted: boolean;
  mass: number;
}

interface PopAnim {
  x: number;
  y: number;
  r: number;
  color: string;
  start: number;
}

interface Vec2 {
  x: number;
  y: number;
}

/* ============================================================================
 * PURE MATH HELPERS
 * ==========================================================================*/
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Rotates a forward-facing unit vector by `deg` degrees (used to turn an aim
// angle like "+20 degrees off straight" into an actual direction vector).
const rotateVec = (f: Vec2, deg: number): Vec2 => {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: f.x * cos - f.y * sin, y: f.x * sin + f.y * cos };
};

// Inverse of rotateVec: given a forward vector and a target direction,
// returns the signed angle (degrees) needed to rotate forward onto that
// direction. Used by the AI to convert "I want to hit this point" into an angle.
const vecToAngle = (f: Vec2, v: Vec2): number => {
  const len = Math.hypot(v.x, v.y) || 1;
  const nx = v.x / len;
  const ny = v.y / len;
  const cross = f.x * ny - f.y * nx;
  const dot = f.x * nx + f.y * ny;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
};

const createInitialPieces = (): Piece[] => {
  const pieces: Piece[] = [];
  pieces.push({ id: 'queen', x: CENTER, y: CENTER, vx: 0, vy: 0, r: COIN_R, kind: 'queen', potted: false, mass: 1 });

  const innerRadius = COIN_R * 2.15;
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i;
    const kind: PieceKind = i % 2 === 0 ? 'white' : 'black';
    pieces.push({
      id: `in-${i}`,
      x: CENTER + innerRadius * Math.cos(ang),
      y: CENTER + innerRadius * Math.sin(ang),
      vx: 0,
      vy: 0,
      r: COIN_R,
      kind,
      potted: false,
      mass: 1,
    });
  }

  const outerRadius = COIN_R * 4.3;
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI / 6) * i + Math.PI / 12;
    const kind: PieceKind = i % 2 === 0 ? 'black' : 'white';
    pieces.push({
      id: `out-${i}`,
      x: CENTER + outerRadius * Math.cos(ang),
      y: CENTER + outerRadius * Math.sin(ang),
      vx: 0,
      vy: 0,
      r: COIN_R,
      kind,
      potted: false,
      mass: 1,
    });
  }

  pieces.push({ id: 'striker', x: CENTER, y: BASELINE_PLAYER_Y, vx: 0, vy: 0, r: STRIKER_R, kind: 'striker', potted: false, mass: 1.3 });
  return pieces;
};

// Finds an open spot near the center to respot a piece (foul / opponent coin
// potted / uncovered queen). Spirals outward in rings until it finds a gap.
const findFreeSpot = (pieces: Piece[], r: number, excludeId: string): Vec2 => {
  const candidates: Vec2[] = [{ x: CENTER, y: CENTER }];
  for (let ring = 1; ring <= 6; ring++) {
    const rad = r * 2.3 * ring;
    const count = 6 * ring;
    for (let i = 0; i < count; i++) {
      const ang = ((2 * Math.PI) / count) * i;
      candidates.push({ x: CENTER + rad * Math.cos(ang), y: CENTER + rad * Math.sin(ang) });
    }
  }
  for (const c of candidates) {
    const free = pieces.every((p) => p.id === excludeId || p.potted || dist(p, c) > p.r + r + 2);
    if (free) return c;
  }
  return { x: CENTER, y: CENTER };
};

const colorHex: Record<PieceKind, string> = {
  white: '#f4efe3',
  black: '#20201f',
  queen: '#e0442f',
  striker: '#f2c14e',
};

/* ============================================================================
 * COMPONENT
 * ==========================================================================*/
export default function CarromPage() {
  const { user, updateWalletBalance, recordGameMatch } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutable game truth lives in a ref so the animation loop never deals with
  // stale React closures. React state below only mirrors what the UI needs
  // to *display* (score panel, messages, buttons).
  const gameRef = useRef({
    pieces: createInitialPieces(),
    turn: 'player' as Turn,
    simulating: false,
    simFrames: 0,
    dragging: false,
    dragOrigin: { x: CENTER, y: BASELINE_PLAYER_Y } as Vec2,
    pointerPos: null as Vec2 | null,
    shotPotted: new Set<string>(),
    pops: [] as PopAnim[],
    winnerLocked: false,
  });

  const [hasPaidEntry, setHasPaidEntry] = useState(false);
  const [opponentName, setOpponentName] = useState('Rahul_Carrom');
  const [turn, setTurn] = useState<Turn>('player');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('Drag the striker back to aim, release to shoot.');
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(70);
  const [strikerX, setStrikerX] = useState(CENTER);
  const [whiteLeft, setWhiteLeft] = useState(9);
  const [blackLeft, setBlackLeft] = useState(9);
  const [queenOnBoard, setQueenOnBoard] = useState(true);

  const refreshCounts = useCallback(() => {
    const pcs = gameRef.current.pieces;
    setWhiteLeft(pcs.filter((p) => p.kind === 'white' && !p.potted).length);
    setBlackLeft(pcs.filter((p) => p.kind === 'black' && !p.potted).length);
    setQueenOnBoard(!pcs.find((p) => p.kind === 'queen')?.potted);
  }, []);

  /* ---------------------------------------------------------------------
   * GAME SETUP
   * -------------------------------------------------------------------*/
  const initGame = useCallback(() => {
    const pieces = createInitialPieces();
    gameRef.current = {
      pieces,
      turn: 'player',
      simulating: false,
      simFrames: 0,
      dragging: false,
      dragOrigin: { x: CENTER, y: BASELINE_PLAYER_Y },
      pointerPos: null,
      shotPotted: new Set<string>(),
      pops: [],
      winnerLocked: false,
    };
    setTurn('player');
    setPlayerScore(0);
    setAiScore(0);
    setIsSimulating(false);
    setIsAiThinking(false);
    setWinner(null);
    setMessage('Drag the striker back to aim, release to shoot.');
    setAngle(0);
    setPower(70);
    setStrikerX(CENTER);
    setWhiteLeft(9);
    setBlackLeft(9);
    setQueenOnBoard(true);
  }, []);

  const handleStartMatch = async () => {
    if (!user) return;
    if ((user.walletBalance || 0) < ENTRY_COST) {
      alert(`Insufficient wallet balance! You need ₹${ENTRY_COST} to enter Carrom arena.`);
      return;
    }
    await updateWalletBalance(-ENTRY_COST);
    setOpponentName(getRandomOpponentName());
    setHasPaidEntry(true);
    initGame();
  };

  /* ---------------------------------------------------------------------
   * PHYSICS STEP — advances every active piece by one frame
   * -------------------------------------------------------------------*/
  const physicsStep = useCallback(() => {
    const g = gameRef.current;
    const pieces = g.pieces;
    let anyMoving = false;

    for (const p of pieces) {
      if (p.potted) continue;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed < MIN_SPEED) {
        p.vx = 0;
        p.vy = 0;
        continue;
      }
      anyMoving = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      // Pocket capture takes priority over wall collision so pieces near a
      // corner fall in rather than bouncing off the frame.
      let potted = false;
      for (const pocket of POCKETS) {
        if (dist(p, pocket) < POCKET_R - 2) {
          p.potted = true;
          p.vx = 0;
          p.vy = 0;
          g.shotPotted.add(p.id);
          g.pops.push({ x: pocket.x, y: pocket.y, r: p.r, color: colorHex[p.kind], start: performance.now() });
          potted = true;
          break;
        }
      }
      if (potted) continue;

      // Wall bounce
      if (p.x < PLAY_MIN + p.r) {
        p.x = PLAY_MIN + p.r;
        p.vx = -p.vx * WALL_RESTITUTION;
      } else if (p.x > PLAY_MAX - p.r) {
        p.x = PLAY_MAX - p.r;
        p.vx = -p.vx * WALL_RESTITUTION;
      }
      if (p.y < PLAY_MIN + p.r) {
        p.y = PLAY_MIN + p.r;
        p.vy = -p.vy * WALL_RESTITUTION;
      } else if (p.y > PLAY_MAX - p.r) {
        p.y = PLAY_MAX - p.r;
        p.vy = -p.vy * WALL_RESTITUTION;
      }
    }

    // Pairwise elastic collisions (equal-ish mass, striker slightly heavier)
    const active = pieces.filter((p) => !p.potted);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const minD = a.r + b.r;
        if (d >= minD) continue;

        const nx = dx / d;
        const ny = dy / d;

        // Positional correction so pieces don't sink into each other
        const overlap = minD - d;
        const invA = 1 / a.mass;
        const invB = 1 / b.mass;
        const corr = (overlap / (invA + invB)) * 0.8;
        a.x -= nx * corr * invA;
        a.y -= ny * corr * invA;
        b.x += nx * corr * invB;
        b.y += ny * corr * invB;

        // Velocity impulse
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal > 0) continue;
        const j2 = (-(1 + COIN_RESTITUTION) * velAlongNormal) / (invA + invB);
        a.vx -= j2 * nx * invA;
        a.vy -= j2 * ny * invA;
        b.vx += j2 * nx * invB;
        b.vy += j2 * ny * invB;
        anyMoving = true;
      }
    }

    g.simFrames += 1;
    if (!anyMoving || g.simFrames > MAX_SIM_FRAMES) {
      g.simulating = false;
    }
  }, []);

  /* ---------------------------------------------------------------------
   * SHOOTING
   * -------------------------------------------------------------------*/
  const shoot = useCallback((forward: Vec2, angleDeg: number, powerPct: number) => {
    const g = gameRef.current;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (!striker) return;
    const dir = rotateVec(forward, angleDeg);
    const speed = MIN_SHOT_SPEED + (clamp(powerPct, 0, 100) / 100) * (MAX_SHOT_SPEED - MIN_SHOT_SPEED);
    striker.vx = dir.x * speed;
    striker.vy = dir.y * speed;
    g.shotPotted = new Set<string>();
    g.simFrames = 0;
    g.simulating = true;
    setIsSimulating(true);
    setMessage('Shot in motion...');
  }, []);

  /* ---------------------------------------------------------------------
   * SHOT RESOLUTION — real carrom scoring rules, run once all pieces stop
   * -------------------------------------------------------------------*/
  const resolveShot = useCallback(() => {
    const g = gameRef.current;
    const currentTurn = g.turn;
    const currentKind: PieceKind = currentTurn === 'player' ? 'white' : 'black';
    const opponentKind: PieceKind = currentTurn === 'player' ? 'black' : 'white';

    const strikerFoul = g.shotPotted.has('striker');
    const pottedPieces = g.pieces.filter((p) => g.shotPotted.has(p.id) && p.kind !== 'striker');

    let scoreDelta = 0;
    let continueTurn = false;
    let msg = '';

    if (strikerFoul) {
      // Foul: the whole stroke is voided — anything pocketed this shot is
      // respotted, and a penalty is applied.
      pottedPieces.forEach((p) => {
        const spot = findFreeSpot(g.pieces, p.r, p.id);
        p.x = spot.x;
        p.y = spot.y;
        p.vx = 0;
        p.vy = 0;
        p.potted = false;
      });
      scoreDelta = -FOUL_PENALTY;
      msg = 'Foul! Striker pocketed — stroke voided, -5 points.';
      continueTurn = false;
    } else {
      const own = pottedPieces.filter((p) => p.kind === currentKind);
      const opp = pottedPieces.filter((p) => p.kind === opponentKind);
      const queen = pottedPieces.find((p) => p.kind === 'queen');

      // Potting the opponent's coin scores nothing and it goes back on the board.
      opp.forEach((p) => {
        const spot = findFreeSpot(g.pieces, p.r, p.id);
        p.x = spot.x;
        p.y = spot.y;
        p.vx = 0;
        p.vy = 0;
        p.potted = false;
      });

      scoreDelta = own.length * COIN_POINTS;

      if (queen) {
        if (own.length > 0) {
          // Queen must be "covered" by one of your own coins in the same
          // stroke, otherwise she isn't banked.
          scoreDelta += QUEEN_POINTS;
          msg = `Queen covered! +${scoreDelta} points.`;
        } else {
          const spot = findFreeSpot(g.pieces, queen.r, queen.id);
          queen.x = spot.x;
          queen.y = spot.y;
          queen.vx = 0;
          queen.vy = 0;
          queen.potted = false;
          msg = 'Queen must be covered with your own coin — respotted, no bonus.';
        }
      } else if (own.length > 0) {
        msg = `Nice shot! +${scoreDelta} points — go again.`;
      } else if (opp.length > 0) {
        msg = "Potted the opponent's coin — no points, turn passes.";
      } else {
        msg = 'Miss — turn passes.';
      }

      continueTurn = own.length > 0;
    }

    if (currentTurn === 'player') {
      setPlayerScore((s) => Math.max(0, s + scoreDelta));
    } else {
      setAiScore((s) => Math.max(0, s + scoreDelta));
    }
    setMessage(msg);
    refreshCounts();

    // Win check
    const finalPlayerScore = currentTurn === 'player' ? Math.max(0, playerScore + scoreDelta) : playerScore;
    const finalAiScore = currentTurn === 'ai' ? Math.max(0, aiScore + scoreDelta) : aiScore;

    if (!g.winnerLocked && finalPlayerScore >= WIN_SCORE) {
      g.winnerLocked = true;
      const winnerName = user?.name || 'Player';
      setWinner(winnerName);
      updateWalletBalance(WIN_REWARD);
      recordGameMatch('carrom', 'Pro Carrom Board', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
      confetti({ particleCount: 120, spread: 80 });
      setIsSimulating(false);
      return;
    }
    if (!g.winnerLocked && finalAiScore >= WIN_SCORE) {
      g.winnerLocked = true;
      setWinner(opponentName);
      recordGameMatch('carrom', 'Pro Carrom Board', 'LOSS', ENTRY_COST, 0, opponentName);
      setIsSimulating(false);
      return;
    }

    // Reset striker for whoever plays next
    const nextTurn: Turn = continueTurn ? currentTurn : currentTurn === 'player' ? 'ai' : 'player';
    g.turn = nextTurn;
    setTurn(nextTurn);

    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (striker) {
      striker.potted = false;
      striker.vx = 0;
      striker.vy = 0;
      striker.y = nextTurn === 'player' ? BASELINE_PLAYER_Y : BASELINE_AI_Y;
      striker.x = clamp(striker.x, BASELINE_MIN_X, BASELINE_MAX_X);
      setStrikerX(striker.x);
    }
    setAngle(0);
    setIsSimulating(false);

    if (nextTurn === 'ai') {
      // Staged, variable pacing so the opponent's turn feels like a beat of
      // deliberation rather than an instant computed move. Purely a UI/timing
      // affordance — aiPlayTurn's underlying targeting logic is unchanged.
      setIsAiThinking(true);
      setMessage(`${opponentName} is thinking...`);
      const thinkDelay = 700 + Math.random() * 900; // ~0.7s - 1.6s
      aiTimeoutRef.current = setTimeout(() => {
        setMessage(`${opponentName} is lining up the shot...`);
        const aimDelay = 450 + Math.random() * 550; // ~0.45s - 1s
        aiTimeoutRef.current = setTimeout(() => {
          aiPlayTurn();
          setIsAiThinking(false);
        }, aimDelay);
      }, thinkDelay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerScore, aiScore, user, opponentName, updateWalletBalance, recordGameMatch, refreshCounts]);

  /* ---------------------------------------------------------------------
   * AI OPPONENT — picks a real target and fires through the same physics
   * engine the player uses. No dice rolls: the outcome is whatever the
   * simulated shot actually produces.
   * -------------------------------------------------------------------*/
  const aiPlayTurn = useCallback(() => {
    const g = gameRef.current;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (!striker) return;

    const targets = g.pieces.filter((p) => p.kind === 'black' && !p.potted);
    const fallback = g.pieces.filter((p) => p.kind === 'queen' && !p.potted);
    const pool = targets.length > 0 ? targets : fallback;

    if (pool.length === 0) {
      // Nothing left to aim at — tap the queen's old center spot gently.
      striker.x = CENTER;
      striker.y = BASELINE_AI_Y;
      shoot({ x: 0, y: 1 }, 0, 40);
      return;
    }

    // Pick the coin/pocket pair with the shortest coin->pocket distance —
    // easiest shot available, like a beginner-level heuristic player.
    let bestCoin = pool[0];
    let bestPocket = POCKETS[0];
    let bestDist = Infinity;
    for (const coin of pool) {
      for (const pocket of POCKETS) {
        const d = dist(coin, pocket);
        if (d < bestDist) {
          bestDist = d;
          bestCoin = coin;
          bestPocket = pocket;
        }
      }
    }

    // Direction the coin needs to travel: from pocket toward coin, continued.
    const toPocket = { x: bestPocket.x - bestCoin.x, y: bestPocket.y - bestCoin.y };
    const len = Math.hypot(toPocket.x, toPocket.y) || 1;
    const dirToPocket = { x: toPocket.x / len, y: toPocket.y / len };

    // Contact point on the far side of the coin (away from the pocket).
    const contact = {
      x: bestCoin.x - dirToPocket.x * (bestCoin.r + STRIKER_R),
      y: bestCoin.y - dirToPocket.y * (bestCoin.r + STRIKER_R),
    };

    // Project backward from the contact point to the AI baseline to choose
    // a striker start x-position roughly in line with the shot.
    const forward: Vec2 = { x: 0, y: 1 };
    let startX = contact.x;
    if (Math.abs(dirToPocket.y) > 0.001) {
      const t = (BASELINE_AI_Y - contact.y) / dirToPocket.y;
      startX = contact.x - dirToPocket.x * t;
    }
    startX = clamp(startX, BASELINE_MIN_X, BASELINE_MAX_X);

    striker.x = startX;
    striker.y = BASELINE_AI_Y;

    // Slight human-like inaccuracy so the AI doesn't play perfectly.
    const noise = (Math.random() - 0.5) * 9;
    const aimVec = { x: contact.x - startX, y: contact.y - BASELINE_AI_Y };
    const aimAngle = vecToAngle(forward, aimVec) + noise;

    const shotDistance = dist(striker, bestCoin) + dist(bestCoin, bestPocket);
    const aiPower = clamp(45 + shotDistance / 6, 45, 96);

    shoot(forward, aimAngle, aiPower);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoot]);

  /* ---------------------------------------------------------------------
   * MAIN LOOP
   * -------------------------------------------------------------------*/
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

    /* ---------- Wooden frame ---------- */
    const frameGrad = ctx.createLinearGradient(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    frameGrad.addColorStop(0, '#7a4a24');
    frameGrad.addColorStop(1, '#5a3418');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

    /* ---------- Play surface ---------- */
    const surfaceGrad = ctx.createLinearGradient(PLAY_MIN, PLAY_MIN, PLAY_MAX, PLAY_MAX);
    surfaceGrad.addColorStop(0, '#ecd3a4');
    surfaceGrad.addColorStop(1, '#e2c290');
    ctx.fillStyle = surfaceGrad;
    ctx.fillRect(PLAY_MIN, PLAY_MIN, PLAY_MAX - PLAY_MIN, PLAY_MAX - PLAY_MIN);

    // Double border line (real boards have an outer + inner playing line)
    ctx.strokeStyle = 'rgba(90,52,24,0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(PLAY_MIN, PLAY_MIN, PLAY_MAX - PLAY_MIN, PLAY_MAX - PLAY_MIN);
    ctx.strokeStyle = 'rgba(90,52,24,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PLAY_MIN + 10, PLAY_MIN + 10, PLAY_MAX - PLAY_MIN - 20, PLAY_MAX - PLAY_MIN - 20);

    /* ---------- Center 8-point star + guide circles ---------- */
    ctx.save();
    ctx.translate(CENTER, CENTER);
    const spikes = 8;
    const outerR = 130;
    const innerR = 34;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const starGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, outerR);
    starGrad.addColorStop(0, '#c0392b');
    starGrad.addColorStop(1, '#3a1a10');
    ctx.fillStyle = starGrad;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(179,51,51,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,5,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 40, 0, Math.PI * 2);
    ctx.stroke();

    /* ---------- Baselines on all four sides ----------
     * Only the top (AI) and bottom (player) lines are ever used for
     * gameplay — striker placement and win/foul logic never reference the
     * left/right lines. They're drawn only so the board looks complete on
     * every side, matching a real 4-player board. */
    const drawHBaseline = (y: number, active: boolean, color: string) => {
      ctx.strokeStyle = active ? color : 'rgba(122,74,36,0.5)';
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(BASELINE_MIN_X, y);
      ctx.lineTo(BASELINE_MAX_X, y);
      ctx.stroke();
    };
    const drawVBaseline = (x: number) => {
      ctx.strokeStyle = 'rgba(122,74,36,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, BASELINE_MIN_X);
      ctx.lineTo(x, BASELINE_MAX_X);
      ctx.stroke();
    };
    drawHBaseline(BASELINE_PLAYER_Y, g.turn === 'player' && !g.simulating, '#10b981');
    drawHBaseline(BASELINE_AI_Y, g.turn === 'ai' && !g.simulating, '#f59e0b');
    drawVBaseline(LEFT_BASELINE_X);
    drawVBaseline(RIGHT_BASELINE_X);

    // Small red tick marks at the middle of each of the 4 edges
    ctx.strokeStyle = 'rgba(179,51,51,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CENTER, PLAY_MIN);
    ctx.lineTo(CENTER, PLAY_MIN + 14);
    ctx.moveTo(CENTER, PLAY_MAX);
    ctx.lineTo(CENTER, PLAY_MAX - 14);
    ctx.moveTo(PLAY_MIN, CENTER);
    ctx.lineTo(PLAY_MIN + 14, CENTER);
    ctx.moveTo(PLAY_MAX, CENTER);
    ctx.lineTo(PLAY_MAX - 14, CENTER);
    ctx.stroke();

    /* ---------- Corner pockets + red aiming circles + diagonal arrows ---------- */
    const drawArrowhead = (tipX: number, tipY: number, dx: number, dy: number, size: number) => {
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const perpX = -uy;
      const perpY = ux;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - ux * size - perpX * size * 0.5, tipY - uy * size - perpY * size * 0.5);
      ctx.lineTo(tipX - ux * size + perpX * size * 0.5, tipY - uy * size + perpY * size * 0.5);
      ctx.closePath();
      ctx.fill();
    };

    for (const p of POCKETS) {
      const signX = Math.sign(p.x - CENTER) || 1;
      const signY = Math.sign(p.y - CENTER) || 1;

      // Two small red aiming circles along the edges meeting at this corner
      const c1 = { x: p.x - signX * 62, y: p.y };
      const c2 = { x: p.x, y: p.y - signY * 62 };
      [c1, c2].forEach((c) => {
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3d2410';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Diagonal reference line from just outside the center circle to near the corner
      const start = { x: CENTER + signX * 165, y: CENTER + signY * 165 };
      const end = { x: p.x - signX * 44, y: p.y - signY * 44 };
      ctx.strokeStyle = 'rgba(61,36,16,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(61,36,16,0.55)';
      drawArrowhead(end.x, end.y, signX, signY, 9);

      // Small curved "spin" arrow near the corner end of the diagonal
      const spinCx = end.x - signX * 20;
      const spinCy = end.y - signY * 20;
      ctx.strokeStyle = 'rgba(61,36,16,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spinCx, spinCy, 13, 0.3, Math.PI * 1.5);
      ctx.stroke();

      // Pocket itself
      const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, POCKET_R);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d2410';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    /* ---------- Pop animations (pieces that were just pocketed) ---------- */
    const now = performance.now();
    g.pops = g.pops.filter((pop) => now - pop.start < 380);
    for (const pop of g.pops) {
      const t = (now - pop.start) / 380;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = pop.color;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, pop.r * (1 - t * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* ---------- Pieces ---------- */
    const drawPiece = (p: Piece) => {
      if (p.potted) return;

      // Soft contact shadow for depth
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.r * 0.4, p.r * 0.85, p.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(35,18,4,0.22)';
      ctx.fill();

      const grad = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.15, p.x, p.y, p.r);
      if (p.kind === 'white') {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#f6efdd');
        grad.addColorStop(1, '#e2d3ac');
      } else if (p.kind === 'black') {
        grad.addColorStop(0, '#565654');
        grad.addColorStop(0.6, '#242422');
        grad.addColorStop(1, '#0d0d0c');
      } else if (p.kind === 'queen') {
        grad.addColorStop(0, '#ff9c85');
        grad.addColorStop(0.55, '#e0442f');
        grad.addColorStop(1, '#9e2015');
      } else {
        grad.addColorStop(0, '#fff6d8');
        grad.addColorStop(0.6, '#f2c14e');
        grad.addColorStop(1, '#c98f1e');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Inner detail ring — mimics the turned-wood ring on real coins /
      // the banded pattern on a real Rani (queen) coin
      ctx.strokeStyle =
        p.kind === 'queen' ? 'rgba(255,255,255,0.55)' : p.kind === 'black' ? 'rgba(255,255,255,0.14)' : 'rgba(90,60,20,0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Outer rim
      ctx.strokeStyle = p.kind === 'striker' ? '#8a5a10' : p.kind === 'queen' ? '#7a1a10' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = p.kind === 'striker' ? 2.5 : 1.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    };
    for (const p of g.pieces) {
      if (p.kind !== 'striker') drawPiece(p);
    }
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (striker) drawPiece(striker);

    /* ---------- Aim visualization while dragging ---------- */
    if (g.dragging && g.pointerPos && striker && !striker.potted) {
      const pull = { x: g.pointerPos.x - striker.x, y: g.pointerPos.y - striker.y };
      const pullLen = clamp(Math.hypot(pull.x, pull.y), 0, MAX_DRAG_PX);
      const shotDir = pullLen > 1 ? { x: -pull.x / Math.hypot(pull.x, pull.y), y: -pull.y / Math.hypot(pull.x, pull.y) } : { x: 0, y: -1 };

      // faint pull line
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      ctx.lineTo(striker.x + pull.x * (pullLen / Math.max(1, Math.hypot(pull.x, pull.y))), striker.y + pull.y * (pullLen / Math.max(1, Math.hypot(pull.x, pull.y))));
      ctx.stroke();
      ctx.setLineDash([]);

      // solid shot direction line, length scales with power
      const shotLen = 60 + (pullLen / MAX_DRAG_PX) * 220;
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      ctx.lineTo(striker.x + shotDir.x * shotLen, striker.y + shotDir.y * shotLen);
      ctx.stroke();

      // arrowhead
      const ah = { x: striker.x + shotDir.x * shotLen, y: striker.y + shotDir.y * shotLen };
      const perp = { x: -shotDir.y, y: shotDir.x };
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.moveTo(ah.x + shotDir.x * 12, ah.y + shotDir.y * 12);
      ctx.lineTo(ah.x - perp.x * 7, ah.y - perp.y * 7);
      ctx.lineTo(ah.x + perp.x * 7, ah.y + perp.y * 7);
      ctx.closePath();
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loop() {
    const g = gameRef.current;
    if (g.simulating) {
      physicsStep();
      if (!g.simulating) {
        // shot just finished this frame
        resolveShotRef.current();
      }
    }
    draw();
  }

  // Keep a ref to the latest resolveShot so the loop (defined once) always
  // calls the freshest closure without needing to restart the rAF loop.
  const resolveShotRef = useRef(resolveShot);
  useEffect(() => {
    resolveShotRef.current = resolveShot;
  }, [resolveShot]);

  useEffect(() => {
    if (!hasPaidEntry) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = LOGICAL_SIZE * dpr;
      canvas.height = LOGICAL_SIZE * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPaidEntry]);

  /* ---------------------------------------------------------------------
   * POINTER INTERACTION — drag the striker back to aim, release to shoot
   * -------------------------------------------------------------------*/
  const getLogicalPos = (e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = LOGICAL_SIZE / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (turn !== 'player' || isSimulating || winner) return;
    const g = gameRef.current;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (!striker) return;
    const pos = getLogicalPos(e);
    if (dist(pos, striker) > STRIKER_R + 30) return;
    g.dragging = true;
    g.pointerPos = pos;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g.dragging) return;
    const pos = getLogicalPos(e);
    g.pointerPos = pos;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (!striker) return;
    const pull = { x: pos.x - striker.x, y: pos.y - striker.y };
    const pullLen = Math.hypot(pull.x, pull.y);
    const shotDir = pullLen > 1 ? { x: -pull.x / pullLen, y: -pull.y / pullLen } : { x: 0, y: -1 };
    const liveAngle = Math.round(vecToAngle({ x: 0, y: -1 }, shotDir));
    const livePower = Math.round(clamp((pullLen / MAX_DRAG_PX) * 100, 0, 100));
    setAngle(liveAngle);
    setPower(livePower);
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g.dragging) return;
    g.dragging = false;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (!striker || !g.pointerPos) return;
    const pull = { x: g.pointerPos.x - striker.x, y: g.pointerPos.y - striker.y };
    const pullLen = Math.hypot(pull.x, pull.y);
    if (pullLen < 8) {
      g.pointerPos = null;
      return; // treat as a tap, not a shot
    }
    const shotDir = { x: -pull.x / pullLen, y: -pull.y / pullLen };
    const liveAngle = vecToAngle({ x: 0, y: -1 }, shotDir);
    const livePower = clamp((pullLen / MAX_DRAG_PX) * 100, 15, 100);
    g.pointerPos = null;
    shoot({ x: 0, y: -1 }, liveAngle, livePower);
  };

  /* ---------------------------------------------------------------------
   * SLIDER-DRIVEN CONTROLS (accessible fallback to dragging)
   * -------------------------------------------------------------------*/
  const applyStrikerX = (x: number) => {
    setStrikerX(x);
    const g = gameRef.current;
    const striker = g.pieces.find((p) => p.kind === 'striker');
    if (striker && turn === 'player' && !isSimulating) {
      striker.x = clamp(x, BASELINE_MIN_X, BASELINE_MAX_X);
    }
  };

  const handleManualStrike = () => {
    if (turn !== 'player' || isSimulating || winner) return;
    shoot({ x: 0, y: -1 }, angle, power);
  };

  /* ---------------------------------------------------------------------
   * RENDER
   * -------------------------------------------------------------------*/
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

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Physics Striker Board</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">Pro Carrom Arena</h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Entry: ₹{ENTRY_COST} | Win: ₹{WIN_REWARD}</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 to-emerald-500 text-white flex items-center justify-center shadow-xl">
                <Target className="w-10 h-10 animate-bounce" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">First to {WIN_SCORE} Points Wins!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pay ₹{ENTRY_COST} entry to play against an AI opponent that aims and strikes using the same real
                  physics engine as you. Cover the queen, pocket your coins, avoid fouls.
                </p>
              </div>
              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all"
              >
                Pay ₹{ENTRY_COST} & Play Carrom!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Board */}
              <div className="lg:col-span-8 flex flex-col items-center">
                <div className="relative w-full max-w-[560px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#3d2410]">
                  <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', touchAction: 'none', cursor: turn === 'player' && !isSimulating ? 'grab' : 'default' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                  />
                  {isAiThinking && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 text-amber-300 text-xs font-bold flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>{opponentName} is aiming...</span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-semibold text-center max-w-md">{message}</p>
              </div>

              {/* Side panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-6">
                  {winner ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-extrabold text-base text-center animate-bounce">
                      <Trophy className="w-6 h-6 mx-auto mb-1" />
                      <span>{winner} Wins Carrom Match!</span>
                    </div>
                  ) : (
                    <div className="space-y-3 font-['Space_Grotesk'] text-center">
                      <div className={`p-3 rounded-xl transition-colors ${turn === 'player' ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <p className="text-xs font-bold text-slate-400">YOUR SCORE ({user?.name}) · WHITE</p>
                        <p className="text-2xl font-black text-emerald-500">
                          {playerScore} / {WIN_SCORE}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl transition-colors ${turn === 'ai' ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <p className="text-xs font-bold text-slate-400">{opponentName} · BLACK</p>
                        <p className="text-2xl font-black text-amber-500">
                          {aiScore} / {WIN_SCORE}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <div className="w-3 h-3 rounded-full bg-[#f4efe3] border border-slate-400 mx-auto mb-1" />
                          White left: {whiteLeft}
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <div className="w-3 h-3 rounded-full bg-[#20201f] mx-auto mb-1" />
                          Black left: {blackLeft}
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <Crown className="w-3.5 h-3.5 mx-auto mb-1 text-rose-500" />
                          Queen: {queenOnBoard ? 'on board' : 'potted'}
                        </div>
                      </div>
                    </div>
                  )}

                  {!winner && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Striker position</label>
                        <input
                          type="range"
                          min={BASELINE_MIN_X}
                          max={BASELINE_MAX_X}
                          value={strikerX}
                          disabled={turn !== 'player' || isSimulating}
                          onChange={(e) => applyStrikerX(Number(e.target.value))}
                          className="w-full accent-emerald-500 disabled:opacity-40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Aim angle ({angle}°)</label>
                        <input
                          type="range"
                          min="-80"
                          max="80"
                          value={angle}
                          disabled={turn !== 'player' || isSimulating}
                          onChange={(e) => setAngle(Number(e.target.value))}
                          className="w-full accent-amber-500 disabled:opacity-40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Power ({power}%)</label>
                        <input
                          type="range"
                          min="15"
                          max="100"
                          value={power}
                          disabled={turn !== 'player' || isSimulating}
                          onChange={(e) => setPower(Number(e.target.value))}
                          className="w-full accent-rose-500 disabled:opacity-40"
                        />
                      </div>

                      <button
                        disabled={turn !== 'player' || isSimulating || !!winner}
                        onClick={handleManualStrike}
                        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl disabled:opacity-40 transition-all"
                      >
                        {isSimulating ? 'Striking...' : 'Strike! 🎯'}
                      </button>
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Tip: drag directly on the striker for precise slingshot aiming.
                      </p>
                    </>
                  )}

                  <button
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Match (₹{ENTRY_COST} Stake)</span>
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
