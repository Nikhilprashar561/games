'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Clock, ShieldCheck, Zap, Wallet, Trophy, User, Crown, AlertTriangle, Sparkles, CheckCircle2, LogOut } from 'lucide-react';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type SquareContent = Piece | null;
type BoardMatrix = SquareContent[][];

const INITIAL_BOARD: BoardMatrix = [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' },
  ],
  Array(8).fill(null).map(() => ({ type: 'p', color: 'b' })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'p', color: 'w' })),
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' },
  ],
];

// Official Staunton Render Symbols with Text Presentation Variation Selector (\uFE0E) to prevent emoji color rendering
const STAUNTON_SYMBOLS: Record<string, string> = {
  w_k: '♔\uFE0E', w_q: '♕\uFE0E', w_r: '♖\uFE0E', w_b: '♗\uFE0E', w_n: '♘\uFE0E', w_p: '♙\uFE0E',
  b_k: '♚\uFE0E', b_q: '♛\uFE0E', b_r: '♜\uFE0E', b_b: '♝\uFE0E', b_n: '♞\uFE0E', b_p: '♟\uFE0E',
};

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function ChessPage() {
  const { user, updateWalletBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  const router = useRouter();
  const ENTRY_COST = 25;
  const WIN_REWARD = 44;

  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const handleBackToGames = (e: React.MouseEvent) => {
    if (hasPaidEntry && !gameWinner) {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };

  const [board, setBoard] = useState<BoardMatrix>(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [playerSide, setPlayerSide] = useState<PieceColor>('w');
  const [opponentName, setOpponentName] = useState<string>('Vikram_99');
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Clocks: 10:00 (600s)
  const [whiteTimer, setWhiteTimer] = useState<number>(600);
  const [blackTimer, setBlackTimer] = useState<number>(600);

  // Pawn Promotion Modal State
  const [pendingPromotion, setPendingPromotion] = useState<{ from: [number, number]; to: [number, number]; piece: Piece } | null>(null);

  const opponentSide: PieceColor = playerSide === 'w' ? 'b' : 'w';

  // Countdown Timers Effect
  useEffect(() => {
    if (!hasPaidEntry || gameWinner) return;

    const timerInterval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTimer((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTimer((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [turn, hasPaidEntry, gameWinner]);

  // Format Timer String (e.g. 09:45)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Find King position
  const findKingPosition = (color: PieceColor, currentBoard: BoardMatrix): [number, number] | null => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          return [r, c];
        }
      }
    }
    return null;
  };

  // Check if square is under attack by opponent
  const isSquareAttacked = (sqR: number, sqC: number, defenderColor: PieceColor, currentBoard: BoardMatrix): boolean => {
    const attackerColor = defenderColor === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.color === attackerColor) {
          const rawMoves = getRawMovesForPiece(r, c, piece, currentBoard);
          if (rawMoves.some(([mr, mc]) => mr === sqR && mc === sqC)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Calculate Raw Movement (without check filtering)
  const getRawMovesForPiece = (r: number, c: number, piece: Piece, currentBoard: BoardMatrix): [number, number][] => {
    const moves: [number, number][] = [];
    const color = piece.color;
    const opponent = color === 'w' ? 'b' : 'w';

    const addMove = (nr: number, nc: number) => {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const target = currentBoard[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
        return true;
      }
      if (target.color === opponent) {
        moves.push([nr, nc]);
      }
      return false;
    };

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Single forward step
      if (r + dir >= 0 && r + dir < 8 && !currentBoard[r + dir][c]) {
        moves.push([r + dir, c]);
        // Double step from start
        if (r === startRow && !currentBoard[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }
      // Diagonal Captures
      [-1, 1].forEach((dc) => {
        const nc = c + dc;
        const nr = r + dir;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = currentBoard[nr][nc];
          if (target && target.color === opponent) {
            moves.push([nr, nc]);
          }
        }
      });
    } else if (piece.type === 'n') {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (piece.type === 'r' || piece.type === 'q') {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'b' || piece.type === 'q') {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      dirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMove(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'k') {
      const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      dirs.forEach(([dr, dc]) => addMove(r + dr, c + dc));

      // Castling Support
      if (r === (color === 'w' ? 7 : 0) && c === 4) {
        // Kingside Castling (O-O)
        if (!currentBoard[r][5] && !currentBoard[r][6] && currentBoard[r][7]?.type === 'r' && currentBoard[r][7]?.color === color) {
          if (!isSquareAttacked(r, 4, color, currentBoard) && !isSquareAttacked(r, 5, color, currentBoard) && !isSquareAttacked(r, 6, color, currentBoard)) {
            moves.push([r, 6]);
          }
        }
        // Queenside Castling (O-O-O)
        if (!currentBoard[r][1] && !currentBoard[r][2] && !currentBoard[r][3] && currentBoard[r][0]?.type === 'r' && currentBoard[r][0]?.color === color) {
          if (!isSquareAttacked(r, 4, color, currentBoard) && !isSquareAttacked(r, 3, color, currentBoard) && !isSquareAttacked(r, 2, color, currentBoard)) {
            moves.push([r, 2]);
          }
        }
      }
    }

    return moves;
  };

  // Filter legal moves so player cannot leave own King in Check
  const getLegalMovesForPiece = (r: number, c: number, piece: Piece, currentBoard: BoardMatrix): [number, number][] => {
    const raw = getRawMovesForPiece(r, c, piece, currentBoard);
    return raw.filter(([tr, tc]) => {
      // Simulate move
      const tempBoard = currentBoard.map((row) => [...row]);
      tempBoard[tr][tc] = piece;
      tempBoard[r][c] = null;

      const kingPos = findKingPosition(piece.color, tempBoard);
      if (!kingPos) return true;

      // Verify King is not attacked in temp position
      return !isSquareAttacked(kingPos[0], kingPos[1], piece.color, tempBoard);
    });
  };

  // Check state indicator for active turn King
  const activeKingPos = findKingPosition(turn, board);
  const isKingInCheck = activeKingPos ? isSquareAttacked(activeKingPos[0], activeKingPos[1], turn, board) : false;

  // Humanized Opponent Turn (1.8s - 2.5s Latency)
  useEffect(() => {
    if (!hasPaidEntry || gameWinner || pendingPromotion) return;

    if (turn === opponentSide) {
      setIsOpponentThinking(true);
      const timer = setTimeout(() => {
        makeOpponentMove();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [turn, hasPaidEntry, gameWinner, opponentSide, board, pendingPromotion]);

  const makeOpponentMove = async () => {
    const allOpponentMoves: { from: [number, number]; to: [number, number]; piece: Piece; target: SquareContent }[] = [];

    board.forEach((row, r) => {
      row.forEach((piece, c) => {
        if (piece && piece.color === opponentSide) {
          const legal = getLegalMovesForPiece(r, c, piece, board);
          legal.forEach(([tr, tc]) => {
            allOpponentMoves.push({
              from: [r, c],
              to: [tr, tc],
              piece,
              target: board[tr][tc],
            });
          });
        }
      });
    });

    if (allOpponentMoves.length === 0) {
      setIsOpponentThinking(false);
      // Checkmate or Stalemate
      if (isKingInCheck) {
        setGameWinner(user?.name || 'Player');
        await recordGameMatch('chess', 'Grandmaster Chess', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
        confetti({ particleCount: 120, spread: 80 });
      } else {
        setGameWinner('Draw / Stalemate');
      }
      return;
    }

    // Priority: Capture > Random
    const captures = allOpponentMoves.filter((m) => m.target !== null);
    const chosen = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : allOpponentMoves[Math.floor(Math.random() * allOpponentMoves.length)];

    const [fr, fc] = chosen.from;
    const [tr, tc] = chosen.to;

    const newBoard = board.map((row) => [...row]);
    let executedPiece = chosen.piece;

    // Handle Opponent Pawn Promotion automatically (default to Queen)
    if (chosen.piece.type === 'p' && (tr === 0 || tr === 7)) {
      executedPiece = { type: 'q', color: opponentSide };
    }

    // Handle Opponent Castling
    if (chosen.piece.type === 'k' && Math.abs(tc - fc) === 2) {
      if (tc === 6) { // Kingside
        newBoard[fr][5] = newBoard[fr][7];
        newBoard[fr][7] = null;
      } else if (tc === 2) { // Queenside
        newBoard[fr][3] = newBoard[fr][0];
        newBoard[fr][0] = null;
      }
    }

    newBoard[tr][tc] = executedPiece;
    newBoard[fr][fc] = null;

    const moveStr = `${opponentName} ${chosen.piece.type.toUpperCase()}${COLS[fc]}${8 - fr} ➔ ${COLS[tc]}${8 - tr}`;

    setBoard(newBoard);
    setLastMove({ from: [fr, fc], to: [tr, tc] });
    setIsOpponentThinking(false);
    setTurn(playerSide);
    setMoveHistory((prev) => [moveStr, ...prev]);

    if (chosen.target && chosen.target.type === 'k') {
      setGameWinner(opponentName);
      await recordGameMatch('chess', 'Grandmaster Chess', 'LOSS', ENTRY_COST, 0, opponentName);
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
    await updateWalletBalance(-ENTRY_COST);
    setHasPaidEntry(true);
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setTurn('w');
    setWhiteTimer(600);
    setBlackTimer(600);
    setOpponentName(getRandomOpponentName());
    setMoveHistory([]);
    setIsOpponentThinking(false);
    setGameWinner(null);
    setPendingPromotion(null);
  };

  // Complete Pawn Promotion Selection
  const completePromotion = async (pieceType: PieceType) => {
    if (!pendingPromotion) return;
    const { from, to, piece } = pendingPromotion;
    const [fr, fc] = from;
    const [tr, tc] = to;

    const newBoard = board.map((row) => [...row]);
    const promotedPiece: Piece = { type: pieceType, color: piece.color };
    const targetPiece = board[tr][tc];

    newBoard[tr][tc] = promotedPiece;
    newBoard[fr][fc] = null;

    const moveStr = `You ${pieceType.toUpperCase()}${COLS[fc]}${8 - fr} ➔ ${COLS[tc]}${8 - tr} (Promoted!)`;

    setBoard(newBoard);
    setLastMove({ from: [fr, fc], to: [tr, tc] });
    setSelectedSquare(null);
    setValidMoves([]);
    setPendingPromotion(null);
    setTurn(opponentSide);
    setMoveHistory((prev) => [moveStr, ...prev]);

    if (targetPiece && targetPiece.type === 'k') {
      const winnerName = user?.name || 'Player';
      setGameWinner(winnerName);
      await recordGameMatch('chess', 'Grandmaster Chess', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
      confetti({ particleCount: 120, spread: 80 });
    }
  };

  // Handle Square Selection & Player Moves
  const handleSquareClick = async (r: number, c: number) => {
    if (!hasPaidEntry || gameWinner || turn !== playerSide || isOpponentThinking || pendingPromotion) return;

    if (selectedSquare) {
      const [sr, sc] = selectedSquare;
      if (sr === r && sc === c) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
      if (isValid) {
        const piece = board[sr][sc]!;
        const targetPiece = board[r][c];

        // Check for Pawn Promotion (reached 8th rank)
        if (piece.type === 'p' && (r === 0 || r === 7)) {
          setPendingPromotion({ from: [sr, sc], to: [r, c], piece });
          return;
        }

        const newBoard = board.map((row) => [...row]);

        // Handle Castling Rook Relocation
        if (piece.type === 'k' && Math.abs(c - sc) === 2) {
          if (c === 6) { // Kingside
            newBoard[sr][5] = newBoard[sr][7];
            newBoard[sr][7] = null;
          } else if (c === 2) { // Queenside
            newBoard[sr][3] = newBoard[sr][0];
            newBoard[sr][0] = null;
          }
        }

        newBoard[r][c] = piece;
        newBoard[sr][sc] = null;

        const moveStr = `You ${piece.type.toUpperCase()}${COLS[sc]}${8 - sr} ➔ ${COLS[c]}${8 - r}`;

        setBoard(newBoard);
        setLastMove({ from: [sr, sc], to: [r, c] });
        setSelectedSquare(null);
        setValidMoves([]);
        setTurn(opponentSide);
        setMoveHistory((prev) => [moveStr, ...prev]);

        if (targetPiece && targetPiece.type === 'k') {
          const winnerName = user?.name || 'Player';
          setGameWinner(winnerName);
          await recordGameMatch('chess', 'Grandmaster Chess', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
          confetti({ particleCount: 120, spread: 80 });
        }
      } else {
        const piece = board[r][c];
        if (piece && piece.color === playerSide) {
          setSelectedSquare([r, c]);
          setValidMoves(getLegalMovesForPiece(r, c, piece, board));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = board[r][c];
      if (piece && piece.color === playerSide) {
        setSelectedSquare([r, c]);
        setValidMoves(getLegalMovesForPiece(r, c, piece, board));
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/#games-section"
          onClick={handleBackToGames}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </Link>

        {/* Main Chess Arena Card - Ludo King Quality Polish */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ludo King Quality Chess Arena</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Grandmaster Chess Supreme
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
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/20">
                <Crown className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                  Choose Your Chess Side Theme!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pay ₹25 entry to challenge online player <span className="font-bold text-emerald-500">{opponentName}</span>. Winner claims ₹45!
                </p>
              </div>

              <div className="flex justify-center items-center gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => setPlayerSide('w')}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerSide === 'w'
                      ? 'bg-white text-slate-950 border-amber-500 shadow-xl scale-105'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Play White ♔ (First Move)</span>
                </button>

                <button
                  onClick={() => setPlayerSide('b')}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerSide === 'b'
                      ? 'bg-slate-950 text-white border-emerald-500 shadow-xl scale-105'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Play Black ♚</span>
                </button>
              </div>

              <button
                onClick={handleStartMatch}
                className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105"
              >
                Pay ₹25 & Start Chess Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Center Fixed Dimensions Board with Official Coordinates framing */}
              <div className="lg:col-span-8 flex flex-col items-center">
                
                {/* Opponent Player Header & Clock */}
                <div className="w-full max-w-[460px] flex items-center justify-between px-4 py-2.5 mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-950 border border-slate-600"></div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Opponent: {opponentName} ({opponentSide === 'w' ? 'White ♔' : 'Black ♚'})
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs font-mono font-black px-3 py-1 rounded-full border ${
                    turn === opponentSide ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse' : 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-transparent'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{opponentSide === 'w' ? formatTime(whiteTimer) : formatTime(blackTimer)}</span>
                  </div>
                </div>

                {/* Fixed 8x8 Board Container with Algebraic Coordinates Framing (A-H, 1-8) */}
                <div className="relative p-3.5 rounded-3xl bg-[#4b382a] border-4 border-[#2c1d12] shadow-2xl select-none">
                  
                  {/* Top Algebraic Labels (A - H) */}
                  <div className="flex justify-between px-3 pb-1 text-[11px] font-black text-[#d4b483]">
                    {COLS.map((c) => (
                      <span key={c} className="w-8 sm:w-12 text-center">{c}</span>
                    ))}
                  </div>

                  <div className="flex items-center">
                    
                    {/* Left Rank Numbers (8 - 1) */}
                    <div className="flex flex-col justify-between pr-1 text-[11px] font-black text-[#d4b483]">
                      {Array.from({ length: 8 }, (_, i) => 8 - i).map((num) => (
                        <span key={num} className="h-8 sm:h-12 flex items-center">{num}</span>
                      ))}
                    </div>

                    {/* Fixed Grid 8x8 Board Canvas */}
                    <div className="w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] grid grid-cols-8 grid-rows-8 border-2 border-[#2c1d12] shadow-inner bg-slate-900 rounded-xl overflow-hidden">
                      {board.map((row, r) =>
                        row.map((piece, c) => {
                          const isDarkSquare = (r + c) % 2 === 1;
                          const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                          const isValidTarget = validMoves.some(([vr, vc]) => vr === r && vc === c);
                          const isLastMoveSq = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));
                          const isKingCheckSq = isKingInCheck && activeKingPos && activeKingPos[0] === r && activeKingPos[1] === c;

                          return (
                            <button
                              key={`${r}-${c}`}
                              disabled={isOpponentThinking || turn !== playerSide || !!gameWinner}
                              onClick={() => handleSquareClick(r, c)}
                              className={`relative flex items-center justify-center text-3xl sm:text-4xl transition-all duration-150 overflow-hidden ${
                                isKingCheckSq
                                  ? 'bg-rose-600 ring-4 ring-rose-500 animate-pulse text-white'
                                  : isSelected
                                  ? 'bg-amber-400/90 text-slate-950 shadow-inner'
                                  : isValidTarget
                                  ? 'bg-emerald-500/40 ring-2 ring-emerald-400'
                                  : isLastMoveSq
                                  ? 'bg-amber-300/40'
                                  : isDarkSquare
                                  ? 'bg-[#b58863] text-[#f0d9b5]'
                                  : 'bg-[#f0d9b5] text-[#b58863]'
                              }`}
                            >
                              {piece ? (
                                <span className={`transform transition-transform duration-200 ${
                                  isSelected ? 'scale-125' : 'hover:scale-110'
                                } ${piece.color === 'w' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : 'text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'}`}>
                                  {STAUNTON_SYMBOLS[`${piece.color}_${piece.type}`]}
                                </span>
                              ) : null}

                              {/* Legal Move Indicator Dot / Target Ring */}
                              {isValidTarget && !piece && (
                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md animate-pulse"></div>
                              )}
                              {isValidTarget && piece && (
                                <div className="absolute inset-0 border-4 border-rose-500 rounded-lg animate-ping pointer-events-none opacity-60"></div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Rank Numbers */}
                    <div className="flex flex-col justify-between pl-1 text-[11px] font-black text-[#d4b483]">
                      {Array.from({ length: 8 }, (_, i) => 8 - i).map((num) => (
                        <span key={num} className="h-8 sm:h-12 flex items-center">{num}</span>
                      ))}
                    </div>

                  </div>

                  {/* Bottom Algebraic Labels (A - H) */}
                  <div className="flex justify-between px-3 pt-1 text-[11px] font-black text-[#d4b483]">
                    {COLS.map((c) => (
                      <span key={c} className="w-8 sm:w-12 text-center">{c}</span>
                    ))}
                  </div>

                </div>

                {/* Player Header & Clock */}
                <div className="w-full max-w-[460px] flex items-center justify-between px-4 py-2.5 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded-full bg-white border border-slate-400"></div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {user?.name} (You - {playerSide === 'w' ? 'White ♔' : 'Black ♚'})
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs font-mono font-black px-3 py-1 rounded-full border ${
                    turn === playerSide ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 animate-pulse' : 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-transparent'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{playerSide === 'w' ? formatTime(whiteTimer) : formatTime(blackTimer)}</span>
                  </div>
                </div>

              </div>

              {/* Status & Move Log Controls Panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                  
                  {/* King in Check Warning Banner */}
                  {isKingInCheck && !gameWinner && (
                    <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 font-black text-xs flex items-center space-x-2 animate-bounce">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>CHECK! {turn === playerSide ? 'Your King is under attack!' : `${opponentName}'s King is under attack!`}</span>
                    </div>
                  )}

                  {gameWinner ? (
                    <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 text-center animate-bounce">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <span>{gameWinner} Wins Match!</span>
                      </div>
                      {gameWinner !== opponentName ? (
                        <span className="text-xs text-emerald-400 font-bold">+₹{WIN_REWARD} Credited to Wallet!</span>
                      ) : (
                        <span className="text-xs text-rose-400 font-bold">Better luck next match!</span>
                      )}
                    </div>
                  ) : isOpponentThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} evaluating tactical move...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Match Status</span>
                      <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase ${
                        turn === playerSide ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}>
                        {turn === playerSide ? 'Your Turn' : `${opponentName}'s Turn`}
                      </span>
                    </div>
                  )}

                  {/* Move History Logger */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center justify-between">
                      <span>Algebraic Move Log</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    </h3>
                    <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300 pr-2">
                      {moveHistory.length === 0 ? (
                        <p className="text-slate-400 italic">Select your piece to view valid destination highlights.</p>
                      ) : (
                        moveHistory.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                            <span className="text-slate-400">#{moveHistory.length - idx}</span>
                            <span className="font-extrabold">{m}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'NEXT_MATCH' })}
                    className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Chess Match (₹25 Stake)</span>
                  </button>

                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'LEAVE_GAME' })}
                    className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-2 mt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Game</span>
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>

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

        {/* Pawn Promotion Modal Selection Choice */}
        {pendingPromotion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black font-['Space_Grotesk'] text-slate-900 dark:text-white">
                Promote Your Pawn!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Select a piece to replace your promoted pawn:
              </p>

              <div className="grid grid-cols-4 gap-2 pt-2">
                {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => (
                  <button
                    key={pType}
                    onClick={() => completePromotion(pType)}
                    className="p-3 rounded-2xl bg-slate-100 hover:bg-amber-400 dark:bg-slate-800 dark:hover:bg-amber-400 hover:text-slate-950 text-3xl font-black transition-all flex items-center justify-center shadow-md"
                  >
                    {STAUNTON_SYMBOLS[`${pendingPromotion.piece.color}_${pType}`]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
