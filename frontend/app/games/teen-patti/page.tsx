'use client';

import React, { useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import {
  ArrowLeft,
  Wallet,
  Clock,
  Crown,
  Eye,
  Ban,
  Coins,
  User as UserIcon,
  Users,
  Swords,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Zap,
  LogOut,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

// ============================================================================
// CORE TYPES & SPECIFICATIONS
// ============================================================================

type Suit = 'S' | 'H' | 'D' | 'C';
type TableSize = 2 | 3 | 4 | 5 | 6;

interface Card {
  rank: number; // 2..14 (14 = Ace)
  suit: Suit;
  id: string;
}

type PlayerState =
  | 'Waiting'
  | 'Active'
  | 'Blind'
  | 'Seen'
  | 'Folded'
  | 'SideShowPending'
  | 'Winner';

interface TPPlayer {
  id: string; // 'user', 'p1', 'p2', etc.
  name: string;
  cards: Card[];
  state: PlayerState;
  isBlind: boolean;
  hasSeen: boolean;
  totalBet: number;
}

interface HandResult {
  category: number; // 6 Trail/Trio, 5 Pure Seq, 4 Seq, 3 Color/Flush, 2 Pair, 1 High Card
  label: string;
  tiebreak: number[];
}

interface SideShowRequest {
  fromPlayerId: string;
  toPlayerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

interface RoundResult {
  id: string;
  winnerId: string;
  category: number;
  label: string;
  potWon: number;
  mode: 'sole-survivor' | 'showdown' | 'sideshow-loss';
  showdown?: { a: string; b: string; handA: HandResult; handB: HandResult } | null;
}

interface GameState {
  phase: 'lobby' | 'playing' | 'sideshow-pending' | 'result';
  tableSize: TableSize;
  bootAmount: number;
  seatOrder: string[];
  turnSequence: string[];
  players: Record<string, TPPlayer>;
  botNames: Partial<Record<string, string>>;
  dealerIndex: number;
  pot: number;
  currentStake: number;
  currentTurn: string;
  turnTimer: number;
  activeSideShow: SideShowRequest | null;
  result: RoundResult | null;
  actionMessage: string | null;
}

// ============================================================================
// CONSTANTS & LABELS
// ============================================================================

const TURN_SECONDS = 18;

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const HAND_LABELS: Record<number, string> = {
  6: 'Trio / Trail (AAA)',
  5: 'Pure Sequence (Straight Flush)',
  4: 'Sequence (Straight)',
  3: 'Color (Flush)',
  2: 'Pair',
  1: 'High Card',
};

const SEATS_BY_SIZE: Record<TableSize, string[]> = {
  2: ['user', 'top'],
  3: ['user', 'left', 'right'],
  4: ['user', 'left', 'top', 'right'],
  5: ['user', 'left-bottom', 'left-top', 'right-top', 'right-bottom'],
  6: ['user', 'left-bottom', 'left-top', 'top', 'right-top', 'right-bottom'],
};

const POSITION_ACCENT: Record<string, string> = {
  user: '#10b981',
  left: '#8b5cf6',
  top: '#f97316',
  right: '#06b6d4',
  'left-bottom': '#ec4899',
  'left-top': '#3b82f6',
  'right-top': '#f59e0b',
  'right-bottom': '#14b8a6',
};

const rankLabel = (r: number) => RANK_LABELS[r] || String(r);
const jitter = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

// ============================================================================
// CRYPTOGRAPHIC SHUFFLE & HAND EVALUATION ENGINE
// ============================================================================

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s, id: `${r}-${s}` });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function evaluateHand(cards: Card[]): HandResult {
  if (!cards || cards.length !== 3) {
    return { category: 1, label: HAND_LABELS[1], tiebreak: [2, 2, 2] };
  }

  const ranks = [...cards.map((c) => c.rank)].sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];

  let isSeq = false;
  let seqHigh = ranks[0];
  if (!isTrail) {
    if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) {
      isSeq = true;
      seqHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
      // Ace-2-3 sequence
      isSeq = true;
      seqHigh = 3;
    }
  }

  const isPair = !isTrail && (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]);

  if (isTrail) return { category: 6, label: HAND_LABELS[6], tiebreak: [ranks[0]] };
  if (isSeq && isFlush) return { category: 5, label: HAND_LABELS[5], tiebreak: [seqHigh] };
  if (isSeq) return { category: 4, label: HAND_LABELS[4], tiebreak: [seqHigh] };
  if (isFlush) return { category: 3, label: HAND_LABELS[3], tiebreak: ranks };
  if (isPair) {
    let pairRank = ranks[0];
    let kicker = ranks[2];
    if (ranks[0] === ranks[1]) {
      pairRank = ranks[0];
      kicker = ranks[2];
    } else if (ranks[1] === ranks[2]) {
      pairRank = ranks[1];
      kicker = ranks[0];
    } else {
      pairRank = ranks[0];
      kicker = ranks[1];
    }
    return { category: 2, label: HAND_LABELS[2], tiebreak: [pairRank, kicker] };
  }
  return { category: 1, label: HAND_LABELS[1], tiebreak: ranks };
}

function compareHands(a: HandResult, b: HandResult): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const HAND_STRENGTH: Record<number, number> = { 6: 0.95, 5: 0.85, 4: 0.7, 3: 0.55, 2: 0.35, 1: 0.15 };

// ============================================================================
// GAME STATE REDUCER
// ============================================================================

const LOBBY_STATE: GameState = {
  phase: 'lobby',
  tableSize: 4,
  bootAmount: 10,
  seatOrder: SEATS_BY_SIZE[4],
  turnSequence: SEATS_BY_SIZE[4],
  players: {} as Record<string, TPPlayer>,
  botNames: {},
  dealerIndex: 0,
  pot: 0,
  currentStake: 10,
  currentTurn: 'user',
  turnTimer: TURN_SECONDS,
  activeSideShow: null,
  result: null,
  actionMessage: null,
};

type Action =
  | { type: 'SET_TABLE_SIZE'; size: TableSize }
  | { type: 'SET_BOOT_AMOUNT'; boot: number }
  | {
      type: 'DEAL';
      payload: {
        seatOrder: string[];
        turnSequence: string[];
        players: Record<string, TPPlayer>;
        botNames: Partial<Record<string, string>>;
        bootAmount: number;
      };
    }
  | { type: 'SEE'; seat: string }
  | { type: 'PACK'; seat: string }
  | { type: 'CHAAL'; seat: string; isRaise?: boolean }
  | { type: 'SIDE_SHOW_REQUEST'; fromSeat: string }
  | { type: 'SIDE_SHOW_RESPOND'; accept: boolean }
  | { type: 'SHOW'; seat: string }
  | { type: 'TICK' }
  | { type: 'RESET' };

function nextActiveSeat(players: Record<string, TPPlayer>, turnSequence: string[], from: string): string {
  let idx = turnSequence.indexOf(from);
  for (let i = 0; i < turnSequence.length; i++) {
    idx = (idx + 1) % turnSequence.length;
    const id = turnSequence[idx];
    if (players[id] && players[id].state !== 'Folded') return id;
  }
  return from;
}

function activeSeats(players: Record<string, TPPlayer>, turnSequence: string[]): string[] {
  return turnSequence.filter((id) => players[id] && players[id].state !== 'Folded');
}

function getPreviousActiveSeenPlayer(
  players: Record<string, TPPlayer>,
  turnSequence: string[],
  currentSeat: string
): string | null {
  let idx = turnSequence.indexOf(currentSeat);
  for (let i = 0; i < turnSequence.length - 1; i++) {
    idx = (idx - 1 + turnSequence.length) % turnSequence.length;
    const id = turnSequence[idx];
    const p = players[id];
    if (p && p.state !== 'Folded') {
      return p.hasSeen ? id : null;
    }
  }
  return null;
}

function finalizeRound(
  state: GameState,
  players: Record<string, TPPlayer>,
  winnerId: string,
  mode: RoundResult['mode'],
  showdown?: RoundResult['showdown']
): GameState {
  const winnerHand = evaluateHand(players[winnerId]?.cards || []);
  const updatedPlayers = { ...players };
  if (updatedPlayers[winnerId]) {
    updatedPlayers[winnerId].state = 'Winner';
  }

  return {
    ...state,
    players: updatedPlayers,
    phase: 'result',
    result: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      winnerId,
      category: winnerHand.category,
      label: HAND_LABELS[winnerHand.category] || winnerHand.label,
      potWon: state.pot,
      mode,
      showdown: showdown || null,
    },
    actionMessage: `${updatedPlayers[winnerId]?.name || 'Player'} wins the pot of ₹${state.pot}! 🏆`,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_TABLE_SIZE':
      return {
        ...state,
        tableSize: action.size,
        seatOrder: SEATS_BY_SIZE[action.size],
        turnSequence: SEATS_BY_SIZE[action.size],
      };

    case 'SET_BOOT_AMOUNT':
      return { ...state, bootAmount: action.boot, currentStake: action.boot };

    case 'DEAL':
      return {
        ...LOBBY_STATE,
        phase: 'playing',
        tableSize: state.tableSize,
        bootAmount: action.payload.bootAmount,
        seatOrder: action.payload.seatOrder,
        turnSequence: action.payload.turnSequence,
        players: action.payload.players,
        botNames: action.payload.botNames,
        pot: action.payload.bootAmount * action.payload.seatOrder.length,
        currentStake: action.payload.bootAmount,
        currentTurn: 'user',
        turnTimer: TURN_SECONDS,
        result: null,
        actionMessage: 'Cards dealt! Boot deducted from all seats. Game begins!',
      };

    case 'SEE': {
      if (state.phase !== 'playing') return state;
      const p = state.players[action.seat];
      if (!p || p.state === 'Folded' || p.hasSeen) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.seat]: { ...p, isBlind: false, hasSeen: true, state: 'Seen' },
        },
        actionMessage: `${p.name} flipped cards and is now SEEN!`,
      };
    }

    case 'PACK': {
      if (state.phase !== 'playing') return state;
      const p = state.players[action.seat];
      if (!p || p.state === 'Folded') return state;
      const players = { ...state.players, [action.seat]: { ...p, state: 'Folded' as PlayerState } };
      const active = activeSeats(players, state.turnSequence);
      if (active.length === 1) {
        return finalizeRound(state, players, active[0], 'sole-survivor');
      }
      const next = nextActiveSeat(players, state.turnSequence, action.seat);
      return {
        ...state,
        players,
        currentTurn: next,
        turnTimer: TURN_SECONDS,
        actionMessage: `${p.name} packed (folded).`,
      };
    }

    case 'CHAAL': {
      if (state.phase !== 'playing') return state;
      const p = state.players[action.seat];
      if (!p || p.state === 'Folded') return state;

      // Standard Teen Patti stake calculation:
      // Blind bet = 1x currentStake (or 2x if raising)
      // Seen bet  = 2x currentStake (or 4x if raising)
      const cost = p.isBlind
        ? (action.isRaise ? state.currentStake * 2 : state.currentStake)
        : (action.isRaise ? state.currentStake * 4 : state.currentStake * 2);

      const newStake = action.isRaise ? state.currentStake * 2 : state.currentStake;
      const players = {
        ...state.players,
        [action.seat]: { ...p, totalBet: p.totalBet + cost },
      };
      const pot = state.pot + cost;
      const next = nextActiveSeat(players, state.turnSequence, action.seat);

      return {
        ...state,
        players,
        pot,
        currentStake: newStake,
        currentTurn: next,
        turnTimer: TURN_SECONDS,
        actionMessage: `${p.name} placed ${action.isRaise ? 'Raise' : 'Chaal'} of ₹${cost}.`,
      };
    }

    case 'SIDE_SHOW_REQUEST': {
      if (state.phase !== 'playing') return state;
      const fromP = state.players[action.fromSeat];
      if (!fromP || fromP.isBlind) return state;

      const targetId = getPreviousActiveSeenPlayer(state.players, state.turnSequence, action.fromSeat);
      if (!targetId) return state;

      // Deduct side show fee equal to current seen bet amount
      const cost = state.currentStake * 2;
      const players = {
        ...state.players,
        [action.fromSeat]: { ...fromP, totalBet: fromP.totalBet + cost },
      };
      const pot = state.pot + cost;

      return {
        ...state,
        phase: 'sideshow-pending',
        players,
        pot,
        activeSideShow: {
          fromPlayerId: action.fromSeat,
          toPlayerId: targetId,
          status: 'PENDING',
        },
        actionMessage: `${fromP.name} paid ₹${cost} & requested Side Show with ${state.players[targetId]?.name}!`,
      };
    }

    case 'SIDE_SHOW_RESPOND': {
      if (state.phase !== 'sideshow-pending' || !state.activeSideShow) return state;
      const { fromPlayerId, toPlayerId } = state.activeSideShow;
      const fromP = state.players[fromPlayerId];
      const toP = state.players[toPlayerId];

      if (!action.accept) {
        const next = nextActiveSeat(state.players, state.turnSequence, fromPlayerId);
        return {
          ...state,
          phase: 'playing',
          currentTurn: next,
          turnTimer: TURN_SECONDS,
          activeSideShow: null,
          actionMessage: `${toP?.name} rejected the Side Show. Game continues!`,
        };
      }

      // Hand Evaluation for Side Show comparison
      const handFrom = evaluateHand(fromP.cards);
      const handTo = evaluateHand(toP.cards);
      const cmp = compareHands(handFrom, handTo);

      let loserId = fromPlayerId;
      if (cmp > 0) loserId = toPlayerId;
      else if (cmp < 0) loserId = fromPlayerId;
      else loserId = fromPlayerId; // Tie: requester folds

      const players = {
        ...state.players,
        [loserId]: { ...state.players[loserId], state: 'Folded' as PlayerState },
      };

      const active = activeSeats(players, state.turnSequence);
      if (active.length === 1) {
        return finalizeRound(state, players, active[0], 'sideshow-loss');
      }

      const next = nextActiveSeat(players, state.turnSequence, fromPlayerId);
      return {
        ...state,
        phase: 'playing',
        players,
        currentTurn: next,
        turnTimer: TURN_SECONDS,
        activeSideShow: null,
        actionMessage: `Side Show accepted! ${state.players[loserId]?.name} lost comparison & packed!`,
      };
    }

    case 'SHOW': {
      if (state.phase !== 'playing') return state;
      const p = state.players[action.seat];
      const active = activeSeats(state.players, state.turnSequence);
      if (active.length !== 2 || !active.includes(action.seat)) return state;

      // Show fee equals current bet amount
      const cost = p ? (p.isBlind ? state.currentStake : state.currentStake * 2) : 0;
      const players = {
        ...state.players,
        [action.seat]: { ...p, totalBet: p.totalBet + cost },
      };
      const pot = state.pot + cost;

      const [a, b] = active;
      const handA = evaluateHand(players[a].cards);
      const handB = evaluateHand(players[b].cards);
      const cmp = compareHands(handA, handB);
      const winner = cmp >= 0 ? a : b;
      return finalizeRound({ ...state, pot }, players, winner, 'showdown', { a, b, handA, handB });
    }

    case 'TICK': {
      if (state.phase !== 'playing') return state;
      if (state.turnTimer <= 1) {
        // Auto-pack on turn timer expiration to prevent game freeze
        return reducer(state, { type: 'PACK', seat: state.currentTurn });
      }
      return { ...state, turnTimer: state.turnTimer - 1 };
    }

    case 'RESET':
      return {
        ...LOBBY_STATE,
        tableSize: state.tableSize,
        bootAmount: state.bootAmount,
        seatOrder: SEATS_BY_SIZE[state.tableSize],
        turnSequence: SEATS_BY_SIZE[state.tableSize],
      };

    default:
      return state;
  }
}

// ============================================================================
// PRESENTATIONAL CARD COMPONENTS
// ============================================================================

function CardFace({ card, small }: { card: Card; small?: boolean }) {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const suitChar = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit];
  return (
    <div
      className={`${
        small ? 'w-10 h-14' : 'w-14 h-20 sm:w-16 sm:h-24'
      } rounded-xl bg-white border border-slate-300 shadow-xl flex flex-col items-center justify-between p-1.5 font-black leading-none transform transition-transform hover:scale-105 select-none ${
        isRed ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      <div className="w-full flex justify-start">
        <span className={small ? 'text-xs' : 'text-sm sm:text-base'}>{rankLabel(card.rank)}</span>
      </div>
      <span className={small ? 'text-sm' : 'text-xl sm:text-2xl'}>{suitChar}</span>
      <div className="w-full flex justify-end">
        <span className={small ? 'text-xs' : 'text-sm sm:text-base'}>{rankLabel(card.rank)}</span>
      </div>
    </div>
  );
}

function CardBack({ small }: { small?: boolean }) {
  return (
    <div
      className={`${
        small ? 'w-10 h-14' : 'w-14 h-20 sm:w-16 sm:h-24'
      } rounded-xl bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-900 border-2 border-amber-300 shadow-xl relative overflow-hidden flex items-center justify-center select-none`}
    >
      <div className="absolute inset-1 rounded-lg border border-amber-300/40" />
      <span className="text-amber-200/80 text-xl font-bold">♠</span>
    </div>
  );
}

// ============================================================================
// MAIN TEEN PATTI COMPONENT
// ============================================================================

export default function TeenPattiPage() {
  const { user, updateWalletBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  const router = useRouter();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const [state, dispatch] = useReducer(reducer, LOBBY_STATE);

  const handleBackToGames = (e: React.MouseEvent) => {
    if (state.phase === 'playing' || state.phase === 'result') {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };
  const stateRef = useRef(state);
  const settledRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Turn Timer Tick ----
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // ---- AI Player Decision Engine ----
  useEffect(() => {
    if (state.phase !== 'playing' || state.currentTurn === 'user') return;
    const seat = state.currentTurn;

    let actTimer: ReturnType<typeof setTimeout> | null = null;

    const decideTimer = setTimeout(() => {
      const s = stateRef.current;
      const p = s.players[seat];
      if (!p || p.state === 'Folded' || s.phase !== 'playing') return;

      let willPeek = false;
      if (p.isBlind) {
        const stakeRatio = s.currentStake / Math.max(s.pot, 1);
        willPeek = Math.random() < 0.45 || stakeRatio > 0.3;
        if (willPeek) dispatch({ type: 'SEE', seat });
      }

      actTimer = setTimeout(() => {
        const s2 = stateRef.current;
        const pCur = s2.players[seat];
        if (!pCur || pCur.state === 'Folded' || s2.phase !== 'playing' || s2.currentTurn !== seat) return;

        let action: 'pack' | 'chaal' | 'raise' | 'sideshow' | 'show' = 'pack';

        if (pCur.isBlind) {
          action = Math.random() < 0.82 ? 'chaal' : 'pack';
        } else {
          const { category } = evaluateHand(pCur.cards);
          const strength = HAND_STRENGTH[category] + (Math.random() * 0.16 - 0.08);
          const active = activeSeats(s2.players, s2.turnSequence);

          const prevSeenId = getPreviousActiveSeenPlayer(s2.players, s2.turnSequence, seat);

          if (active.length === 2 && strength > 0.6) {
            action = 'show';
          } else if (prevSeenId && strength > 0.5 && Math.random() < 0.4) {
            action = 'sideshow';
          } else if (strength > 0.75 && Math.random() < 0.4) {
            action = 'raise';
          } else if (strength > 0.28) {
            action = 'chaal';
          } else if (strength > 0.12 && Math.random() < 0.3) {
            action = 'chaal'; // Bluff
          } else {
            action = 'pack';
          }
        }

        if (action === 'pack') dispatch({ type: 'PACK', seat });
        else if (action === 'raise') dispatch({ type: 'CHAAL', seat, isRaise: true });
        else if (action === 'sideshow') dispatch({ type: 'SIDE_SHOW_REQUEST', fromSeat: seat });
        else if (action === 'show') dispatch({ type: 'SHOW', seat });
        else dispatch({ type: 'CHAAL', seat });
      }, jitter(500, 950));
    }, jitter(800, 1800));

    return () => {
      clearTimeout(decideTimer);
      if (actTimer) clearTimeout(actTimer);
    };
  }, [state.currentTurn, state.phase]);

  // ---- AI Side Show Response Engine ----
  useEffect(() => {
    if (state.phase !== 'sideshow-pending' || !state.activeSideShow) return;
    const { toPlayerId } = state.activeSideShow;
    if (toPlayerId === 'user') return; // User handles response manually via modal!

    const timer = setTimeout(() => {
      const p = stateRef.current.players[toPlayerId];
      if (!p) return;
      const { category } = evaluateHand(p.cards);
      const accept = category >= 2 || Math.random() < 0.6;
      dispatch({ type: 'SIDE_SHOW_RESPOND', accept });
    }, jitter(1000, 1800));

    return () => clearTimeout(timer);
  }, [state.phase, state.activeSideShow]);

  // ---- Settle Match Results ----
  useEffect(() => {
    if (state.phase !== 'result' || !state.result) return;
    if (settledRef.current === state.result.id) return;
    settledRef.current = state.result.id;

    if (state.result.winnerId === 'user') {
      const loserSeat = state.result.showdown ? (state.result.showdown.a === 'user' ? state.result.showdown.b : state.result.showdown.a) : undefined;
      const payout = Math.round(state.result.potWon * 0.88 * 100) / 100;
      recordGameMatch(
        'teen-patti',
        'Teen Patti Gold',
        'WIN',
        state.bootAmount,
        payout,
        (loserSeat && state.botNames[loserSeat]) || 'The Table'
      );
      confetti({ particleCount: 150, spread: 90 });
    } else {
      recordGameMatch(
        'teen-patti',
        'Teen Patti Gold',
        'LOSS',
        state.bootAmount,
        0,
        state.botNames[state.result.winnerId] || 'Opponent'
      );
    }

    // Auto-start next round after 5 seconds if user balance allows
    const autoNextTimer = setTimeout(() => {
      if (user && (user.walletBalance || 0) >= state.bootAmount) {
        startMatch();
      }
    }, 5000);

    return () => clearTimeout(autoNextTimer);
  }, [state.phase, state.result]);

  const startMatch = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (playMode === 'DEMO') {
      showToast('🔒 Real Money Mode Required: Switch to REAL MONEY mode in top header navbar to play paid games!', 'warning');
      return;
    }
    const currentBalance = user?.walletBalance || 0;
    if (currentBalance < state.bootAmount) {
      showToast(`Insufficient Real Money balance! Boot amount is ₹${state.bootAmount}. Current balance: ₹${formatCurrency(currentBalance)}.`, 'error');
      return;
    }
    await updateWalletBalance(-state.bootAmount);

    const seatOrder = SEATS_BY_SIZE[state.tableSize];
    const turnSequence = SEATS_BY_SIZE[state.tableSize];
    const deck = shuffleDeck(buildDeck());

    const botNames: Partial<Record<string, string>> = {};
    const usedNames = new Set<string>();
    seatOrder.forEach((seatId) => {
      if (seatId === 'user') return;
      let name = getRandomOpponentName();
      let tries = 0;
      while (usedNames.has(name) && tries < 5) {
        name = getRandomOpponentName();
        tries++;
      }
      usedNames.add(name);
      botNames[seatId] = name;
    });

    const players = {} as Record<string, TPPlayer>;
    seatOrder.forEach((seatId, i) => {
      players[seatId] = {
        id: seatId,
        name: seatId === 'user' ? user?.name || 'You' : botNames[seatId] || 'Player',
        cards: [deck[i * 3], deck[i * 3 + 1], deck[i * 3 + 2]],
        state: 'Blind',
        isBlind: true,
        hasSeen: false,
        totalBet: state.bootAmount,
      };
    });

    dispatch({
      type: 'DEAL',
      payload: { seatOrder, turnSequence, players, botNames, bootAmount: state.bootAmount },
    });
  };

  const userPlayer = state.players['user'];
  const isUserTurn = state.phase === 'playing' && state.currentTurn === 'user';
  const active = state.phase === 'playing' ? activeSeats(state.players, state.turnSequence) : [];
  const canShow = isUserTurn && active.length === 2 && userPlayer && !userPlayer.isBlind;

  const previousSeenSeat = isUserTurn ? getPreviousActiveSeenPlayer(state.players, state.turnSequence, 'user') : null;
  const canSideShow = isUserTurn && userPlayer && !userPlayer.isBlind && !!previousSeenSeat;

  const userHandEval = userPlayer && userPlayer.hasSeen ? evaluateHand(userPlayer.cards) : null;
  const opponentSeats = state.seatOrder.filter((s) => s !== 'user');

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

        {/* SIDE SHOW REQUEST MODAL */}
        {state.phase === 'sideshow-pending' && state.activeSideShow?.toPlayerId === 'user' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md p-8 glass-panel rounded-3xl border border-amber-500/50 shadow-2xl text-center space-y-6 bg-[#0d1527] text-white">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg border border-amber-400/30">
                <Swords className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black font-['Space_Grotesk'] text-amber-300">
                  Side Show Requested!
                </h3>
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-white">
                    {state.players[state.activeSideShow.fromPlayerId]?.name}
                  </span>{' '}
                  wants to secretly compare cards with you!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => dispatch({ type: 'SIDE_SHOW_RESPOND', accept: false })}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-all"
                >
                  Reject
                </button>
                <button
                  onClick={() => dispatch({ type: 'SIDE_SHOW_RESPOND', accept: true })}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30 transition-all"
                >
                  Accept Side Show
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Fair Play Teen Patti Engine</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Teen Patti Gold
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Boot: ₹{state.bootAmount}</span>
              </div>
            </div>
          </div>

          {state.phase === 'lobby' ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-black font-['Space_Grotesk']">Select Table Configuration</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Standard 52-Card Teen Patti with Fisher-Yates cryptographically secure shuffle, Side Show, Blind/Seen bets, and Trail rankings.
                </p>
              </div>

              {/* Table Size Selector */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Table Size:</p>
                <div className="grid grid-cols-5 gap-2">
                  {( [2, 3, 4, 5, 6] as TableSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => dispatch({ type: 'SET_TABLE_SIZE', size })}
                      className={`py-3 px-2 rounded-2xl font-black text-xs border-2 transition-all flex flex-col items-center justify-center space-y-1 ${
                        state.tableSize === size
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg scale-105'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{size} P</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Boot Selection */}
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs font-black uppercase text-slate-400">Choose Boot Amount:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((boot) => (
                    <button
                      key={boot}
                      onClick={() => dispatch({ type: 'SET_BOOT_AMOUNT', boot })}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs border-2 transition-all ${
                        state.bootAmount === boot
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                      }`}
                    >
                      ₹{boot}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹{state.bootAmount} Boot & Start Match!
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* STATUS ACTION BANNER */}
              {state.actionMessage && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-extrabold text-center shadow-lg animate-fade-in flex items-center justify-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{state.actionMessage}</span>
                </div>
              )}

              {/* POKER TABLE FELT */}
              <div
                className="relative w-full h-[380px] sm:h-[450px] bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 border-[12px] border-amber-900/80 shadow-2xl overflow-hidden select-none"
                style={{ borderRadius: '50% / 36%' }}
              >
                {/* Felt Texture & Glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
                </div>

                {/* Center Pot & Table Information */}
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 z-10">
                  {state.phase === 'result' && state.result ? (
                    <div className="bg-slate-950/90 rounded-3xl px-6 py-5 text-center space-y-3 border border-amber-400/40 shadow-2xl max-w-[85%] animate-fade-in">
                      <div className="flex items-center justify-center space-x-2 text-amber-300 font-black text-base">
                        <Crown className="w-6 h-6 fill-current animate-bounce" />
                        <span>
                          {state.result.winnerId === 'user'
                            ? '🎉 YOU WIN!'
                            : `${state.players[state.result.winnerId]?.name} WINS!`}
                        </span>
                      </div>
                      <p className="text-white/90 text-xs font-semibold">
                        {state.result.mode === 'sole-survivor'
                          ? 'All other players packed / folded'
                          : `Showdown — ${state.result.label}`}
                      </p>
                      <p className="text-emerald-300 font-extrabold text-base">
                        Pot Won: ₹{state.result.potWon}
                      </p>
                      {state.result.showdown && (
                        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800">
                          {[state.result.showdown.a, state.result.showdown.b].map((sid) => (
                            <div key={sid} className="flex flex-col items-center space-y-1">
                              <span className="text-[11px] text-slate-300 font-bold">
                                {state.players[sid]?.name}
                              </span>
                              <div className="flex gap-1">
                                {state.players[sid]?.cards.map((c) => (
                                  <CardFace key={c.id} card={c} small />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 bg-slate-950/70 rounded-full px-5 py-2 border border-amber-400/40 shadow-xl">
                        <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                        <span className="text-white font-black text-base">POT: ₹{state.pot}</span>
                      </div>
                      <span className="text-emerald-300 text-xs font-extrabold bg-slate-900/60 px-3 py-1 rounded-full border border-emerald-500/20">
                        Stake: ₹{state.currentStake}
                      </span>
                    </>
                  )}
                </div>

                {/* Opponent Seats around Oval Table */}
                {opponentSeats.map((seatId) => {
                  const p = state.players[seatId];
                  if (!p) return null;
                  const isTurn = state.currentTurn === seatId && state.phase === 'playing';

                  const posClass =
                    seatId === 'top'
                      ? 'top-4 left-1/2 -translate-x-1/2'
                      : seatId === 'left'
                      ? 'left-6 top-1/2 -translate-y-1/2'
                      : seatId === 'right'
                      ? 'right-6 top-1/2 -translate-y-1/2'
                      : seatId === 'left-bottom'
                      ? 'left-12 bottom-12'
                      : seatId === 'left-top'
                      ? 'left-12 top-12'
                      : seatId === 'right-top'
                      ? 'right-12 top-12'
                      : 'right-12 bottom-12';

                  return (
                    <div key={seatId} className={`absolute ${posClass} z-10 flex flex-col items-center space-y-1.5`}>
                      <div className="flex gap-1 mb-1">
                        {p.state === 'Folded' ? (
                          <span className="text-[10px] font-black text-rose-300 bg-rose-950/80 border border-rose-500/40 px-2.5 py-0.5 rounded-full">
                            PACKED
                          </span>
                        ) : (
                          p.cards.map((c) => <CardBack key={c.id} small />)
                        )}
                      </div>
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${
                          isTurn ? 'ring-4 ring-amber-400 scale-110 shadow-amber-500/50' : ''
                        }`}
                        style={{ backgroundColor: POSITION_ACCENT[seatId] || '#3b82f6', borderColor: 'white' }}
                      >
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="bg-slate-950/80 backdrop-blur-sm rounded-xl px-2.5 py-1 text-center border border-slate-800">
                        <p className="text-[11px] font-black text-white leading-tight">{p.name}</p>
                        <p className="text-[9px] text-emerald-400 font-bold leading-tight">
                          {p.isBlind ? 'Blind' : 'Seen'} · Bet ₹{p.totalBet}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* USER CONTROL PANEL */}
              <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-lg ${
                        isUserTurn ? 'ring-4 ring-amber-400 animate-pulse' : ''
                      }`}
                      style={{ backgroundColor: POSITION_ACCENT.user }}
                    >
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-white">
                        {userPlayer?.name || 'You'}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        {userPlayer?.isBlind ? 'Playing Blind' : 'Cards Seen'} · Total Bet: ₹{userPlayer?.totalBet || 0}
                      </p>
                    </div>
                  </div>

                  {userHandEval && userPlayer?.hasSeen && (
                    <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-black text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>{userHandEval.label}</span>
                    </div>
                  )}

                  {state.phase === 'playing' && (
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-500">
                      <Clock className={`w-4 h-4 ${isUserTurn ? 'text-amber-500 animate-pulse' : ''}`} />
                      <span>
                        {isUserTurn
                          ? `Timer: ${state.turnTimer}s`
                          : `${state.players[state.currentTurn]?.name}'s turn`}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Cards Display */}
                <div className="flex flex-col items-center justify-center gap-3 py-2 relative">
                  <div className="flex items-center justify-center gap-2">
                    {userPlayer?.state === 'Folded' ? (
                      <span className="text-sm font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-2xl border border-rose-500/20">
                        You packed (folded) this round
                      </span>
                    ) : (
                      userPlayer?.cards.map((c) =>
                        userPlayer.isBlind ? <CardBack key={c.id} /> : <CardFace key={c.id} card={c} />
                      )
                    )}
                  </div>

                  {userPlayer && userPlayer.isBlind && userPlayer.state !== 'Folded' && state.phase === 'playing' && (
                    <button
                      onClick={() => dispatch({ type: 'SEE', seat: 'user' })}
                      className="mt-1 flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-extrabold text-xs border border-sky-500/30 transition-all shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Tap to Flip & See Cards</span>
                    </button>
                  )}
                </div>

                {/* Actions Control Grid */}
                {state.phase === 'playing' && userPlayer?.state !== 'Folded' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      disabled={!isUserTurn}
                      onClick={() => dispatch({ type: 'PACK', seat: 'user' })}
                      className="py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Pack (Fold)</span>
                    </button>

                    <button
                      disabled={!isUserTurn}
                      onClick={() => dispatch({ type: 'CHAAL', seat: 'user' })}
                      className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                    >
                      <Coins className="w-4 h-4" />
                      <span>
                        Chaal ₹{userPlayer?.isBlind ? state.currentStake : state.currentStake * 2}
                      </span>
                    </button>

                    <button
                      disabled={!isUserTurn}
                      onClick={() => dispatch({ type: 'CHAAL', seat: 'user', isRaise: true })}
                      className="py-3 px-3 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>
                        Raise ₹{(userPlayer?.isBlind ? state.currentStake : state.currentStake * 2) * 2}
                      </span>
                    </button>

                    <button
                      disabled={!canSideShow}
                      onClick={() => dispatch({ type: 'SIDE_SHOW_REQUEST', fromSeat: 'user' })}
                      className="py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Side Show</span>
                    </button>

                    <button
                      disabled={!canShow}
                      onClick={() => dispatch({ type: 'SHOW', seat: 'user' })}
                      className="py-3 px-3 col-span-2 sm:col-span-1 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all"
                    >
                      <Crown className="w-4 h-4 fill-current" />
                      <span>Show</span>
                    </button>
                  </div>
                )}

                {state.phase === 'result' && (
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'NEXT_MATCH' })}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Play Next Round (₹{state.bootAmount} Boot)</span>
                  </button>
                )}

                <button
                  onClick={() => setConfirmModal({ isOpen: true, type: 'LEAVE_GAME' })}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-2 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave Game</span>
                </button>
              </div>

              {/* Live Match Info Footer */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Game Mode</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white">
                    {state.tableSize} Players
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Players</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white">
                    {state.phase === 'playing' ? active.length : state.seatOrder.length} / {state.seatOrder.length}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Pot</p>
                  <p className="text-xs font-black text-emerald-500">₹{state.pot}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Current Stake</p>
                  <p className="text-xs font-black text-amber-500">₹{state.currentStake}</p>
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
                startMatch();
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
