'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Clock, ShieldCheck, Zap, Wallet, Trophy, User, Crown, AlertTriangle, Sparkles, CheckCircle2, LogOut, Undo2, Copy, Check } from 'lucide-react';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';

// Import chess.js and react-chessboard
import { Chess, Square, PieceSymbol } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function ChessPage() {
  const { user, updateWalletBalance, updateDemoBalance, recordGameMatch, openAuthModal, playMode, showToast, verifyGameEligibility } = useAuth();
  const router = useRouter();

  // Entry fees & rewards for Real Cash and Demo Mode
  const REAL_ENTRY_COST = 25;
  const REAL_WIN_REWARD = 44;
  const DEMO_ENTRY_COST = 10;
  const DEMO_WIN_REWARD = 18;

  const currentEntryCost = playMode === 'DEMO' ? DEMO_ENTRY_COST : REAL_ENTRY_COST;
  const currentWinReward = playMode === 'DEMO' ? DEMO_WIN_REWARD : REAL_WIN_REWARD;

  // Game Engine & State
  const [game, setGame] = useState<Chess>(new Chess());
  const [gameFen, setGameFen] = useState<string>(new Chess().fen());
  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [gameStatusText, setGameStatusText] = useState<string>('');
  
  // Board customization & orientation
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [opponentName, setOpponentName] = useState<string>('Vikram_99');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // Move highlighting & selection
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, { background: string; borderRadius?: string }>>({});
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, { background: string }>>({});
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Move Log History
  const [historySAN, setHistorySAN] = useState<string[]>([]);
  const [copiedFEN, setCopiedFEN] = useState<boolean>(false);

  // Countdown Timers (600s = 10:00)
  const [whiteTimer, setWhiteTimer] = useState<number>(600);
  const [blackTimer, setBlackTimer] = useState<number>(600);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  // Navigation Guard
  const handleBackToGames = (e: React.MouseEvent) => {
    if (hasPaidEntry && !gameWinner) {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };

  // Clock Countdown Timer Effect
  useEffect(() => {
    if (!hasPaidEntry || gameWinner) return;

    const timerInterval = setInterval(() => {
      const currentTurn = game.turn();
      if (currentTurn === 'w') {
        setWhiteTimer((prev) => {
          if (prev <= 1) {
            handleTimeoutLoss('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTimer((prev) => {
          if (prev <= 1) {
            handleTimeoutLoss('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [hasPaidEntry, gameWinner, game]);

  // Handle Timeout Loss
  const handleTimeoutLoss = async (timedOutColor: 'w' | 'b') => {
    const isPlayerLoss = timedOutColor === playerColor;
    const winner = isPlayerLoss ? opponentName : (user?.name || 'Player');
    setGameWinner(winner);
    setGameStatusText(isPlayerLoss ? '⏱️ You lost on time!' : `⏱️ ${opponentName} ran out of time! You Win!`);

    if (!isPlayerLoss) {
      await recordGameMatch('chess', 'Grandmaster Chess', 'WIN', currentEntryCost, currentWinReward, opponentName);
      confetti({ particleCount: 120, spread: 80 });
    } else {
      await recordGameMatch('chess', 'Grandmaster Chess', 'LOSS', currentEntryCost, 0, opponentName);
    }
  };

  // Format Timer String (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get Legal Target Square Styles
  const getMoveOptions = useCallback((square: Square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, { background: string; borderRadius?: string }> = {};
    moves.forEach((move) => {
      const isCapture = game.get(move.to as Square);
      newSquares[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(239,68,68,0.8) 25%, transparent 25%)'
          : 'radial-gradient(circle, rgba(16,185,129,0.7) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });

    newSquares[square] = {
      background: 'rgba(245,158,11,0.5)',
    };
    setOptionSquares(newSquares);
    return true;
  }, [game]);

  // Check Game State (Checkmate, Draw, Stalemate, 50-move rule)
  const checkGameOverState = useCallback(async (gameInstance: Chess) => {
    if (gameInstance.isGameOver()) {
      if (gameInstance.isCheckmate()) {
        const winningColor = gameInstance.turn() === 'w' ? 'b' : 'w';
        const isPlayerWin = winningColor === playerColor;
        const winner = isPlayerWin ? (user?.name || 'Player') : opponentName;
        setGameWinner(winner);
        setGameStatusText(isPlayerWin ? '👑 CHECKMATE! You won the match!' : `❌ CHECKMATE! ${opponentName} won.`);

        if (isPlayerWin) {
          await recordGameMatch('chess', 'Grandmaster Chess', 'WIN', currentEntryCost, currentWinReward, opponentName);
          confetti({ particleCount: 140, spread: 90 });
        } else {
          await recordGameMatch('chess', 'Grandmaster Chess', 'LOSS', currentEntryCost, 0, opponentName);
        }
      } else if (gameInstance.isDraw()) {
        setGameWinner('Draw');
        let drawReason = 'Draw by mutual agreement / rule.';
        if (gameInstance.isStalemate()) drawReason = '🤝 STALEMATE! Game is a draw.';
        else if (gameInstance.isThreefoldRepetition()) drawReason = '🔄 Draw by Threefold Repetition.';
        else if (gameInstance.isInsufficientMaterial()) drawReason = '⚖️ Draw by Insufficient Material.';
        
        setGameStatusText(drawReason);
        await recordGameMatch('chess', 'Grandmaster Chess', 'DRAW', currentEntryCost, currentEntryCost, opponentName);
      }
    }
  }, [playerColor, user, opponentName, currentEntryCost, currentWinReward, recordGameMatch]);

  // Smart Opponent Bot Engine (Humanized delay 1.5s - 2.2s)
  const makeBotMove = useCallback(() => {
    if (game.isGameOver() || game.turn() !== opponentColor) return;

    setIsBotThinking(true);
    setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) {
        setIsBotThinking(false);
        checkGameOverState(game);
        return;
      }

      // Tactical decision: 1. Checkmate > 2. Captures > 3. Random legal move
      const checkmateMove = moves.find((m) => {
        const temp = new Chess(game.fen());
        temp.move(m);
        return temp.isCheckmate();
      });

      const captureMoves = moves.filter((m) => m.captured);

      const chosenMove = checkmateMove || (captureMoves.length > 0
        ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
        : moves[Math.floor(Math.random() * moves.length)]);

      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(chosenMove);

      if (result) {
        setGame(gameCopy);
        setGameFen(gameCopy.fen());
        setHistorySAN(gameCopy.history());
        setLastMoveSquares({
          [result.from]: { background: 'rgba(245, 158, 11, 0.4)' },
          [result.to]: { background: 'rgba(245, 158, 11, 0.4)' },
        });
        checkGameOverState(gameCopy);
      }
      setIsBotThinking(false);
    }, 1800);
  }, [game, opponentColor, checkGameOverState]);

  // Trigger Opponent Bot Turn when active
  useEffect(() => {
    if (!hasPaidEntry || gameWinner || isBotThinking) return;

    if (game.turn() === opponentColor) {
      makeBotMove();
    }
  }, [game, hasPaidEntry, gameWinner, opponentColor, isBotThinking, makeBotMove]);

  // Execute Human Player Move
  const makeAMove = (move: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);

      if (result) {
        setGame(gameCopy);
        setGameFen(gameCopy.fen());
        setHistorySAN(gameCopy.history());
        setLastMoveSquares({
          [result.from]: { background: 'rgba(16, 185, 129, 0.4)' },
          [result.to]: { background: 'rgba(16, 185, 129, 0.4)' },
        });
        setMoveFrom(null);
        setOptionSquares({});
        checkGameOverState(gameCopy);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  // Drag & Drop Handler
  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (!hasPaidEntry || gameWinner || game.turn() !== playerColor || isBotThinking) {
      return false;
    }

    // Check for Pawn Promotion
    const piece = game.get(sourceSquare);
    if (
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'))
    ) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false;
    }

    const moveSuccessful = makeAMove({
      from: sourceSquare,
      to: targetSquare,
    });

    return moveSuccessful;
  };

  // Click Square Handler
  const onSquareClick = (square: Square) => {
    if (!hasPaidEntry || gameWinner || game.turn() !== playerColor || isBotThinking) return;

    // First click: Select piece
    if (!moveFrom) {
      const hasMoves = getMoveOptions(square);
      if (hasMoves) setMoveFrom(square);
      return;
    }

    // Second click: Make move or select new piece
    if (moveFrom === square) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    // Check Pawn Promotion
    const piece = game.get(moveFrom);
    if (
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1'))
    ) {
      setPendingPromotion({ from: moveFrom, to: square });
      return;
    }

    const moveSuccessful = makeAMove({
      from: moveFrom,
      to: square,
    });

    if (!moveSuccessful) {
      const hasMoves = getMoveOptions(square);
      if (hasMoves) {
        setMoveFrom(square);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  // Complete Pawn Promotion Selection Modal
  const handlePromotionSelect = (promotionPiece: PieceSymbol) => {
    if (!pendingPromotion) return;
    makeAMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promotionPiece,
    });
    setPendingPromotion(null);
  };

  // Start New Chess Match (Live DB Verification)
  const handleStartMatch = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    const isEligible = await verifyGameEligibility('chess', REAL_ENTRY_COST, 'REAL');
    if (!isEligible) return;

    const newGame = new Chess();
    setGame(newGame);
    setGameFen(newGame.fen());
    setHasPaidEntry(true);
    setGameWinner(null);
    setGameStatusText('');
    setMoveFrom(null);
    setOptionSquares({});
    setLastMoveSquares({});
    setHistorySAN([]);
    setWhiteTimer(600);
    setBlackTimer(600);
    setOpponentName(getRandomOpponentName());
    setIsBotThinking(false);
    setPendingPromotion(null);
  };

  // Undo Last Player & Bot Move
  const handleUndoMove = () => {
    if (!hasPaidEntry || gameWinner || isBotThinking || historySAN.length < 2) return;

    const gameCopy = new Chess(game.fen());
    gameCopy.undo(); // Undo bot move
    gameCopy.undo(); // Undo player move

    setGame(gameCopy);
    setGameFen(gameCopy.fen());
    setHistorySAN(gameCopy.history());
    setLastMoveSquares({});
    setMoveFrom(null);
    setOptionSquares({});
  };

  // Copy FEN to Clipboard
  const handleCopyFEN = () => {
    navigator.clipboard.writeText(gameFen);
    setCopiedFEN(true);
    setTimeout(() => setCopiedFEN(false), 2000);
  };

  // Find King square if in Check to render red glow
  const customSquareStyles = {
    ...lastMoveSquares,
    ...optionSquares,
    ...(game.inCheck()
      ? {
          [game.board().flatMap((row, r) =>
            row.map((cell, c) =>
              cell && cell.type === 'k' && cell.color === game.turn()
                ? `${String.fromCharCode(97 + c)}${8 - r}`
                : null
            )
          ).find(Boolean) as string]: {
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.6) 100%)',
            borderRadius: '10%',
            boxShadow: '0 0 15px rgba(239,68,68,0.8)',
          },
        }
      : {}),
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

        {/* Main Glassmorphic Arena Panel */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>chess.js + react-chessboard Arena</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Grandmaster Chess Supreme
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-extrabold text-sm">
                <Wallet className="w-4 h-4" />
                <span>
                  Entry: {playMode === 'DEMO' ? formatCoins(DEMO_ENTRY_COST) : `₹${REAL_ENTRY_COST}`} | Win:{' '}
                  {playMode === 'DEMO' ? formatCoins(DEMO_WIN_REWARD) : `₹${REAL_WIN_REWARD}`}
                </span>
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
                  Choose Your Chess Side & Stake!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pay {playMode === 'DEMO' ? formatCoins(DEMO_ENTRY_COST) : `₹${REAL_ENTRY_COST}`} entry to challenge opponent{' '}
                  <span className="font-bold text-emerald-500">{opponentName}</span>. Winner claims{' '}
                  {playMode === 'DEMO' ? formatCoins(DEMO_WIN_REWARD) : `₹${REAL_WIN_REWARD}`}!
                </p>
              </div>

              {/* Side Selection */}
              <div className="flex justify-center items-center gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => setPlayerColor('w')}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerColor === 'w'
                      ? 'bg-white text-slate-950 border-amber-500 shadow-xl scale-105'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Play White ♔ (First Move)</span>
                </button>

                <button
                  onClick={() => setPlayerColor('b')}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerColor === 'b'
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
                Pay {playMode === 'DEMO' ? formatCoins(DEMO_ENTRY_COST) : `₹${REAL_ENTRY_COST}`} & Start Match!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Chessboard Column */}
              <div className="lg:col-span-8 flex flex-col items-center">
                
                {/* Opponent Card Header */}
                <div className="w-full max-w-[500px] flex items-center justify-between px-4 py-2.5 mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-950 border border-slate-600"></div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Opponent: {opponentName} ({opponentColor === 'w' ? 'White ♔' : 'Black ♚'})
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs font-mono font-black px-3 py-1 rounded-full border ${
                    game.turn() === opponentColor
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-transparent'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{opponentColor === 'w' ? formatTime(whiteTimer) : formatTime(blackTimer)}</span>
                  </div>
                </div>

                {/* Interactive react-chessboard Container */}
                <div className="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 select-none">
                  <Chessboard
                    options={{
                      position: gameFen,
                      onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop(sourceSquare as Square, targetSquare as Square),
                      onSquareClick: ({ square }) => onSquareClick(square as Square),
                      boardOrientation: playerColor === 'w' ? 'white' : 'black',
                      squareStyles: customSquareStyles,
                      boardStyle: {
                        borderRadius: '0.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                      },
                      darkSquareStyle: { backgroundColor: '#b58863' },
                      lightSquareStyle: { backgroundColor: '#f0d9b5' },
                    }}
                  />

                  {/* Pawn Promotion Selection Modal Overlay */}
                  {pendingPromotion && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 p-4">
                      <h3 className="text-xl font-extrabold text-white">Promote Pawn</h3>
                      <p className="text-xs text-slate-300">Choose promotion piece:</p>
                      <div className="flex space-x-3">
                        {[
                          { symbol: 'q', label: 'Queen ♕' },
                          { symbol: 'r', label: 'Rook ♖' },
                          { symbol: 'b', label: 'Bishop ♗' },
                          { symbol: 'n', label: 'Knight ♘' },
                        ].map((p) => (
                          <button
                            key={p.symbol}
                            onClick={() => handlePromotionSelect(p.symbol as PieceSymbol)}
                            className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl transition-all hover:scale-110"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Player Card Header */}
                <div className="w-full max-w-[500px] flex items-center justify-between px-4 py-2.5 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-md">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-4 h-4 rounded-full bg-white border border-slate-400"></div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {user?.name} (You - {playerColor === 'w' ? 'White ♔' : 'Black ♚'})
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1.5 text-xs font-mono font-black px-3 py-1 rounded-full border ${
                    game.turn() === playerColor
                      ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-transparent'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{playerColor === 'w' ? formatTime(whiteTimer) : formatTime(blackTimer)}</span>
                  </div>
                </div>

              </div>

              {/* Match Controls & PGN/SAN Log Column */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                  
                  {/* King in Check Warning */}
                  {game.inCheck() && !gameWinner && (
                    <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 font-black text-xs flex items-center space-x-2 animate-bounce">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>CHECK! {game.turn() === playerColor ? 'Your King is under attack!' : `${opponentName}'s King is under attack!`}</span>
                    </div>
                  )}

                  {/* Match Outcome Banner */}
                  {gameWinner ? (
                    <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 text-center animate-bounce">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <span>{gameWinner} Wins Match!</span>
                      </div>
                      <p className="text-xs text-slate-300">{gameStatusText}</p>
                      {gameWinner !== opponentName && gameWinner !== 'Draw' ? (
                        <span className="text-xs text-emerald-400 font-bold">
                          +{playMode === 'DEMO' ? formatCoins(DEMO_WIN_REWARD) : `₹${REAL_WIN_REWARD}`} Credited to Wallet!
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400 font-bold">Better luck next match!</span>
                      )}
                    </div>
                  ) : isBotThinking ? (
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{opponentName} evaluating tactical chess move...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Turn Indicator</span>
                      <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase ${
                        game.turn() === playerColor
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}>
                        {game.turn() === playerColor ? 'Your Turn' : `${opponentName}'s Turn`}
                      </span>
                    </div>
                  )}

                  {/* PGN / Move History Log */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center justify-between">
                      <span>Algebraic Move Log (PGN)</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    </h3>
                    <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300 pr-2">
                      {historySAN.length === 0 ? (
                        <p className="text-slate-400 italic">Drag & drop pieces or click squares to make legal chess moves.</p>
                      ) : (
                        historySAN.reduce<string[][]>((acc, move, idx) => {
                          if (idx % 2 === 0) acc.push([move]);
                          else acc[acc.length - 1].push(move);
                          return acc;
                        }, []).map((pair, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                            <span className="text-slate-400">{idx + 1}.</span>
                            <span className="font-extrabold text-emerald-500">{pair[0]}</span>
                            <span className="font-extrabold text-amber-500">{pair[1] || ''}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Undo & FEN Copy */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleUndoMove}
                      disabled={historySAN.length < 2 || !!gameWinner || isBotThinking}
                      className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>

                    <button
                      onClick={handleCopyFEN}
                      className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5"
                    >
                      {copiedFEN ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFEN ? 'Copied FEN!' : 'Copy FEN'}</span>
                    </button>
                  </div>

                  {/* Reset & Exit Match Buttons */}
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'NEXT_MATCH' })}
                    className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Match ({playMode === 'DEMO' ? formatCoins(DEMO_ENTRY_COST) : `₹${REAL_ENTRY_COST}`})</span>
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

        {/* Confirmation Modal */}
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
              setHasPaidEntry(false);
              setGameWinner(null);
              router.push('/#games-section');
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
