import crypto from 'crypto';

export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  rank: number; // 2..14 (14 = Ace)
  suit: Suit;
  id: string;
}

export type PlayerState =
  | 'Waiting'
  | 'Active'
  | 'Blind'
  | 'Seen'
  | 'Folded'
  | 'SideShowPending'
  | 'Eliminated'
  | 'Winner';

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  state: PlayerState;
  isBlind: boolean;
  hasSeen: boolean;
  totalBet: number;
  balance: number;
  isBot: boolean;
}

export interface HandResult {
  category: number; // 6 = Trio, 5 = Pure Seq, 4 = Seq, 3 = Color, 2 = Pair, 1 = High Card
  label: string;
  tiebreak: number[];
}

export interface SideShowRequest {
  fromPlayerId: string;
  toPlayerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface GameMatchLog {
  timestamp: string;
  action: string;
  playerId: string;
  amount?: number;
  details?: string;
}

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const HAND_LABELS: Record<number, string> = {
  6: 'Trio / Trail (AAA)',
  5: 'Pure Sequence (Straight Flush)',
  4: 'Sequence (Straight)',
  3: 'Color (Flush)',
  2: 'Pair',
  1: 'High Card',
};

// Cryptographically secure Fisher-Yates Shuffle
export function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s, id: `${r}-${s}` });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const randomBuffer = crypto.randomBytes(4);
    const randomNumber = randomBuffer.readUInt32BE(0);
    const j = randomNumber % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// Server-Authoritative Hand Evaluation
export function evaluateHand(cards: Card[]): HandResult {
  if (!cards || cards.length !== 3) {
    return { category: 1, label: 'High Card', tiebreak: [2, 2, 2] };
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
      // Ace-2-3 sequence (Ace acts as 1)
      isSeq = true;
      seqHigh = 3;
    }
  }

  const isPair = !isTrail && (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]);

  if (isTrail) {
    return { category: 6, label: HAND_LABELS[6], tiebreak: [ranks[0]] };
  }
  if (isSeq && isFlush) {
    return { category: 5, label: HAND_LABELS[5], tiebreak: [seqHigh] };
  }
  if (isSeq) {
    return { category: 4, label: HAND_LABELS[4], tiebreak: [seqHigh] };
  }
  if (isFlush) {
    return { category: 3, label: HAND_LABELS[3], tiebreak: ranks };
  }
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

// Compare Hands: Returns > 0 if A wins, < 0 if B wins, 0 if tie
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.category !== b.category) {
    return a.category - b.category;
  }
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export class TeenPattiRoom {
  public id: string;
  public bootAmount: number;
  public currentStake: number;
  public pot: number;
  public players: Player[];
  public dealerIndex: number;
  public currentTurnIndex: number;
  public phase: 'Waiting' | 'Boot' | 'Betting' | 'SideShow' | 'Show' | 'Finished';
  public activeSideShow: SideShowRequest | null;
  public matchLogs: GameMatchLog[];
  public winnerId: string | null;

  constructor(id: string, bootAmount: number = 10) {
    this.id = id;
    this.bootAmount = bootAmount;
    this.currentStake = bootAmount;
    this.pot = 0;
    this.players = [];
    this.dealerIndex = 0;
    this.currentTurnIndex = 0;
    this.phase = 'Waiting';
    this.activeSideShow = null;
    this.matchLogs = [];
    this.winnerId = null;
  }

  public addPlayer(id: string, name: string, balance: number = 1000, isBot: boolean = false): Player {
    const player: Player = {
      id,
      name,
      cards: [],
      state: 'Waiting',
      isBlind: true,
      hasSeen: false,
      totalBet: 0,
      balance,
      isBot,
    };
    this.players.push(player);
    this.logAction(id, 'JOINED', undefined, `${name} joined table.`);
    return player;
  }

  public startRound(): void {
    if (this.players.length < 2) return;

    this.pot = 0;
    this.currentStake = this.bootAmount;
    this.phase = 'Boot';
    this.winnerId = null;
    this.activeSideShow = null;

    // Rotate Dealer Button
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    // Collect Boot from all players
    const deck = createShuffledDeck();

    this.players.forEach((p, idx) => {
      p.state = 'Blind';
      p.isBlind = true;
      p.hasSeen = false;
      p.totalBet = this.bootAmount;
      p.balance = Math.max(0, p.balance - this.bootAmount);
      p.cards = [deck[idx * 3], deck[idx * 3 + 1], deck[idx * 3 + 2]];
      this.pot += this.bootAmount;
    });

    this.logAction('SERVER', 'BOOT_COLLECTED', this.pot, `Collected boot ₹${this.bootAmount} from ${this.players.length} players.`);

    // First turn starts clockwise after dealer
    this.currentTurnIndex = (this.dealerIndex + 1) % this.players.length;
    this.phase = 'Betting';
  }

  public getActivePlayers(): Player[] {
    return this.players.filter((p) => p.state === 'Blind' || p.state === 'Seen' || p.state === 'Active');
  }

  public getCurrentPlayer(): Player {
    return this.players[this.currentTurnIndex];
  }

  public nextTurn(): void {
    const active = this.getActivePlayers();
    if (active.length === 1) {
      this.finishRound(active[0].id, 'Sole Survivor');
      return;
    }

    let count = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      count++;
    } while (
      (this.players[this.currentTurnIndex].state === 'Folded' ||
        this.players[this.currentTurnIndex].state === 'Eliminated') &&
      count < this.players.length
    );
  }

  public seeCards(playerId: string): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.state === 'Folded') return false;
    player.isBlind = false;
    player.hasSeen = true;
    player.state = 'Seen';
    this.logAction(playerId, 'SEE_CARDS', undefined, `${player.name} flipped & saw their cards.`);
    return true;
  }

  public placeChaal(playerId: string, isRaise: boolean = false): { success: boolean; amountPaid: number; message: string } {
    if (this.phase !== 'Betting') return { success: false, amountPaid: 0, message: 'Game not in betting phase' };
    const player = this.getCurrentPlayer();
    if (player.id !== playerId) return { success: false, amountPaid: 0, message: 'Not your turn' };

    let multiplier = 1;
    const prevPlayerIndex = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
    const prevPlayer = this.players[prevPlayerIndex];

    // Blind vs Seen Multiplier Rules
    if (player.isBlind) {
      multiplier = prevPlayer.isBlind ? 1 : 0.5;
    } else {
      multiplier = prevPlayer.isBlind ? 2 : 1;
    }

    if (isRaise) multiplier *= 2;

    const reqAmount = Math.round(this.currentStake * multiplier);
    if (player.balance < reqAmount) {
      return { success: false, amountPaid: 0, message: 'Insufficient balance for Chaal' };
    }

    player.balance -= reqAmount;
    player.totalBet += reqAmount;
    this.pot += reqAmount;

    if (isRaise) {
      this.currentStake *= 2;
    }

    this.logAction(playerId, isRaise ? 'RAISE' : 'CHAAL', reqAmount, `${player.name} placed ${isRaise ? 'Raise' : 'Chaal'} of ₹${reqAmount}.`);
    this.nextTurn();
    return { success: true, amountPaid: reqAmount, message: 'Chaal accepted' };
  }

  public packPlayer(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.state === 'Folded') return;
    player.state = 'Folded';
    this.logAction(playerId, 'PACK', undefined, `${player.name} packed / folded.`);

    const active = this.getActivePlayers();
    if (active.length === 1) {
      this.finishRound(active[0].id, 'Sole Survivor');
    } else if (this.getCurrentPlayer().id === playerId) {
      this.nextTurn();
    }
  }

  public requestSideShow(fromPlayerId: string): boolean {
    const fromPlayer = this.getCurrentPlayer();
    if (fromPlayer.id !== fromPlayerId || fromPlayer.isBlind) return false;

    // Find previous active Seen player
    let prevIdx = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
    while (this.players[prevIdx].state === 'Folded' && prevIdx !== this.currentTurnIndex) {
      prevIdx = (prevIdx - 1 + this.players.length) % this.players.length;
    }

    const prevPlayer = this.players[prevIdx];
    if (prevPlayer.isBlind || prevPlayer.state === 'Folded') return false;

    this.activeSideShow = {
      fromPlayerId,
      toPlayerId: prevPlayer.id,
      status: 'PENDING',
    };

    this.phase = 'SideShow';
    this.logAction(fromPlayerId, 'SIDESHOW_REQUEST', undefined, `${fromPlayer.name} requested Side Show from ${prevPlayer.name}.`);
    return true;
  }

  public respondSideShow(toPlayerId: string, accept: boolean): void {
    if (!this.activeSideShow || this.activeSideShow.toPlayerId !== toPlayerId) return;

    const fromPlayer = this.players.find((p) => p.id === this.activeSideShow!.fromPlayerId)!;
    const toPlayer = this.players.find((p) => p.id === toPlayerId)!;

    if (!accept) {
      this.activeSideShow.status = 'REJECTED';
      this.logAction(toPlayerId, 'SIDESHOW_REJECTED', undefined, `${toPlayer.name} rejected Side Show.`);
      this.activeSideShow = null;
      this.phase = 'Betting';
      return;
    }

    // Evaluate both hands secretly
    const handFrom = evaluateHand(fromPlayer.cards);
    const handTo = evaluateHand(toPlayer.cards);
    const cmp = compareHands(handFrom, handTo);

    let loser = fromPlayer;
    if (cmp > 0) {
      loser = toPlayer;
    } else if (cmp < 0) {
      loser = fromPlayer;
    } else {
      // Tie: Requester packs
      loser = fromPlayer;
    }

    loser.state = 'Folded';
    this.activeSideShow.status = 'ACCEPTED';
    this.logAction(toPlayerId, 'SIDESHOW_ACCEPTED', undefined, `Side Show completed. ${loser.name} lost and packed.`);

    this.activeSideShow = null;
    this.phase = 'Betting';

    const active = this.getActivePlayers();
    if (active.length === 1) {
      this.finishRound(active[0].id, 'Sole Survivor');
    } else {
      this.nextTurn();
    }
  }

  public performShow(playerId: string): { success: boolean; winnerId: string; potWon: number } {
    const active = this.getActivePlayers();
    if (active.length !== 2) return { success: false, winnerId: '', potWon: 0 };
    const player = this.getCurrentPlayer();
    if (player.id !== playerId) return { success: false, winnerId: '', potWon: 0 };

    const opponent = active.find((p) => p.id !== playerId)!;
    const handPlayer = evaluateHand(player.cards);
    const handOpponent = evaluateHand(opponent.cards);
    const cmp = compareHands(handPlayer, handOpponent);

    const winner = cmp >= 0 ? player : opponent;
    this.finishRound(winner.id, 'Showdown', handPlayer, handOpponent);
    return { success: true, winnerId: winner.id, potWon: this.pot };
  }

  public finishRound(
    winnerId: string,
    reason: string,
    handA?: HandResult,
    handB?: HandResult
  ): void {
    const winner = this.players.find((p) => p.id === winnerId);
    if (winner) {
      winner.balance += this.pot;
      winner.state = 'Winner';
    }
    this.winnerId = winnerId;
    this.phase = 'Finished';
    this.logAction(winnerId, 'ROUND_WINNER', this.pot, `${winner?.name || 'Player'} won the pot of ₹${this.pot} (${reason}).`);
  }

  private logAction(playerId: string, action: string, amount?: number, details?: string): void {
    this.matchLogs.push({
      timestamp: new Date().toISOString(),
      action,
      playerId,
      amount,
      details,
    });
  }
}
