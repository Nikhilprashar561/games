'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, User, Trophy, Sparkles, Clock, Coins, Play, ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';
import { GameConfirmModal } from '../../../components/GameConfirmModal';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency, formatCoins } from '../../../utils/formatCurrency';

type BoardState = Array<string | null>;

export default function TicTacToePage() {
  const router = useRouter();
  const { user, updateWalletBalance, updateDemoBalance, recordGameMatch, openAuthModal, playMode, setPlayMode, showToast } = useAuth();
  
  const ENTRY_COST = 10;
  const WIN_REWARD = 17.6;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'NEXT_MATCH' | 'LEAVE_GAME' | 'BACK_TO_GAMES';
  }>({ isOpen: false, type: 'NEXT_MATCH' });

  const handleBackToGames = (e: React.MouseEvent) => {
    if (gameState === 'PLAYING') {
      e.preventDefault();
      setConfirmModal({ isOpen: true, type: 'BACK_TO_GAMES' });
    }
  };
  useEffect(() => {
    setPlayMode('DEMO');
  }, []);

  const [gameState, setGameState] = useState<'CONFIRM' | 'PLAYING' | 'ENDED'>('CONFIRM');
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [opponentName, setOpponentName] = useState<string>('Rohan_Gamer');
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);
  const [scores, setScores] = useState({ x: 0, o: 0, draws: 0 });

  const calculateWinner = (squares: BoardState) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every((cell) => cell !== null)) {
      return { winner: 'Draw', line: [] };
    }
    return null;
  };

  const result = calculateWinner(board);

  // Master Minimax Strategic AI logic
  const getBestMoveIndex = (currentBoard: BoardState): number => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    // 1. Check if AI ('O') can win in 1 move
    for (const [a, b, c] of lines) {
      const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (vals.filter((v) => v === 'O').length === 2 && vals.filter((v) => v === null).length === 1) {
        if (currentBoard[a] === null) return a;
        if (currentBoard[b] === null) return b;
        if (currentBoard[c] === null) return c;
      }
    }

    // 2. Check if Player ('X') can win in 1 move -> BLOCK PLAYER!
    for (const [a, b, c] of lines) {
      const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (vals.filter((v) => v === 'X').length === 2 && vals.filter((v) => v === null).length === 1) {
        if (currentBoard[a] === null) return a;
        if (currentBoard[b] === null) return b;
        if (currentBoard[c] === null) return c;
      }
    }

    // 3. Take Center cell [4] if available
    if (currentBoard[4] === null) return 4;

    // 4. Take Corner cells [0, 2, 6, 8]
    const corners = [0, 2, 6, 8].filter((idx) => currentBoard[idx] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Fallback to any remaining empty spot
    const emptyIndices: number[] = [];
    currentBoard.forEach((cell, idx) => {
      if (cell === null) emptyIndices.push(idx);
    });
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  };

  const makeOpponentMove = (currentBoard: BoardState) => {
    setIsOpponentThinking(true);
    setTimeout(() => {
      const targetIndex = getBestMoveIndex(currentBoard);
      if (targetIndex < 0) {
        setIsOpponentThinking(false);
        return;
      }

      const newBoard = [...currentBoard];
      newBoard[targetIndex] = 'O';
      setBoard(newBoard);
      setIsXNext(true);
      setIsOpponentThinking(false);

      const winCheck = calculateWinner(newBoard);
      if (winCheck?.winner === 'O') {
        setScores((prev) => ({ ...prev, o: prev.o + 1 }));
        setGameState('ENDED');
        recordGameMatch('tic-tac-toe', 'Tic Tac Toe Pro', 'LOSS', ENTRY_COST, 0, opponentName);
      } else if (winCheck?.winner === 'Draw') {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        setGameState('ENDED');
        recordGameMatch('tic-tac-toe', 'Tic Tac Toe Pro', 'DRAW', ENTRY_COST, ENTRY_COST, opponentName);
      }
    }, 1200); // 1.2s Human AI response latency
  };

  // Match Entry Validation & Room Initialization (Settlement handled by backend)
  const startMatch = () => {
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

    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setIsOpponentThinking(false);
    setOpponentName(getRandomOpponentName());
    setGameState('PLAYING');
  };

  const handleClick = (index: number) => {
    if (board[index] || result || isOpponentThinking || !isXNext || gameState !== 'PLAYING') return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const winCheck = calculateWinner(newBoard);

    if (winCheck?.winner) {
      setGameState('ENDED');
      if (winCheck.winner === 'X') {
        setScores((prev) => ({ ...prev, x: prev.x + 1 }));
        recordGameMatch('tic-tac-toe', 'Tic Tac Toe Pro', 'WIN', ENTRY_COST, WIN_REWARD, opponentName);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } else if (winCheck.winner === 'O') {
        setScores((prev) => ({ ...prev, o: prev.o + 1 }));
        recordGameMatch('tic-tac-toe', 'Tic Tac Toe Pro', 'LOSS', ENTRY_COST, 0, opponentName);
      } else {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        recordGameMatch('tic-tac-toe', 'Tic Tac Toe Pro', 'DRAW', ENTRY_COST, ENTRY_COST, opponentName);
      }
    } else {
      setIsXNext(false);
      makeOpponentMove(newBoard);
    }
  };

  const getLineClass = (line: number[]) => {
    if (!line || line.length !== 3) return '';
    const sorted = [...line].sort((a, b) => a - b).join(',');
    switch (sorted) {
      case '0,1,2': return 'top-[16.6%] left-4 right-4 h-1.5 w-[calc(100%-2rem)] -translate-y-1/2';
      case '3,4,5': return 'top-1/2 left-4 right-4 h-1.5 w-[calc(100%-2rem)] -translate-y-1/2';
      case '6,7,8': return 'top-[83.3%] left-4 right-4 h-1.5 w-[calc(100%-2rem)] -translate-y-1/2';
      case '0,3,6': return 'left-[16.6%] top-4 bottom-4 w-1.5 h-[calc(100%-2rem)] -translate-x-1/2';
      case '1,4,7': return 'left-1/2 top-4 bottom-4 w-1.5 h-[calc(100%-2rem)] -translate-x-1/2';
      case '2,5,8': return 'left-[83.3%] top-4 bottom-4 w-1.5 h-[calc(100%-2rem)] -translate-x-1/2';
      case '0,4,8': return 'top-1/2 left-1/2 w-[130%] h-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45';
      case '2,4,6': return 'top-1/2 left-1/2 w-[130%] h-1.5 -translate-x-1/2 -translate-y-1/2 -rotate-45';
      default: return '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Single-Tab Back Navigation */}
      <Link
        href="/#games-section"
        onClick={handleBackToGames}
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Games</span>
      </Link>

      <div className="rounded-3xl p-6 sm:p-8 border-2 border-slate-800 bg-[#0a0f1d] text-white shadow-2xl transition-colors duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Coins Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Space_Grotesk'] text-white">
              Tic Tac Toe Pro
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Matched: {opponentName}</span>
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>🎮 Tic Tac Toe is available exclusively in Demo Mode (Demo Coins). Real Cash mode is disabled for this game.</span>
        </div>

        {/* ========================================================================= */}
        {/* PRE-GAME ENTRY FEE CONFIRMATION POPUP / CARD */}
        {/* ========================================================================= */}
        {gameState === 'CONFIRM' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-5 my-4 animate-fade-in shadow-2xl max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <Coins className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk']">
                Match Entry Fee Confirmation
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Match opponent: <span className="text-emerald-400 font-bold">{opponentName}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-bold text-[11px] uppercase block">Entry Fee</span>
                <span className="text-base font-black text-amber-400">🪙 {ENTRY_COST} Demo</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-bold text-[11px] uppercase block">Win Prize</span>
                <span className="text-base font-black text-emerald-400">🪙 {WIN_REWARD} Demo</span>
              </div>
            </div>

            {/* Upfront Warning Notice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-left flex items-start space-x-2 text-[11px] text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Notice: 🪙 10 Demo Coins will be deducted immediately from your balance as soon as you start this match.</span>
            </div>

            <button
              onClick={startMatch}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Deduct 10 Coins & Start Match 🎮</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GAMEPLAY BOARD */}
        {/* ========================================================================= */}
        {gameState !== 'CONFIRM' && (
          <>
            {/* Score Board */}
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto text-center font-['Space_Grotesk']">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] font-black uppercase text-slate-400">You (X)</p>
                <p className="text-xl font-black text-emerald-400">{scores.x}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] font-black uppercase text-slate-400">Draws</p>
                <p className="text-xl font-black text-slate-300">{scores.draws}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] font-black uppercase text-slate-400">{opponentName} (O)</p>
                <p className="text-xl font-black text-rose-400">{scores.o}</p>
              </div>
            </div>

            {/* Turn State Banner */}
            <div className="text-center mb-6 h-10 flex items-center justify-center">
              {result ? (
                <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-2xl bg-emerald-600 text-white font-black text-base shadow-xl animate-bounce border border-emerald-400">
                  <Trophy className="w-4 h-4" />
                  <span>{result.winner === 'Draw' ? "It's a Draw! (10 Coins Refunded)" : result.winner === 'X' ? `You Won 🪙 ${WIN_REWARD} Demo Coins! 🎉` : `${opponentName} Won!`}</span>
                </div>
              ) : isOpponentThinking ? (
                <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>{opponentName} is evaluating strategy...</span>
                </div>
              ) : (
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Turn: <span className="underline font-black text-emerald-400">{isXNext ? 'Your Turn (X)' : `${opponentName}'s Turn`}</span>
                </p>
              )}
            </div>

            {/* 3x3 Grid - Locked Fixed Dimensions to Prevent Layout Shift */}
            <div className="relative w-[270px] h-[270px] sm:w-[320px] sm:h-[320px] mx-auto aspect-square mb-6">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-3">
                {board.map((cell, idx) => {
                  const isWinningCell = result?.line.includes(idx);
                  return (
                    <button
                      key={idx}
                      disabled={isOpponentThinking || !!cell || !!result}
                      onClick={() => handleClick(idx)}
                      className={`w-full h-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 select-none shadow-md overflow-hidden p-0 m-0 ${
                        cell === null
                          ? 'bg-slate-900 hover:bg-slate-800 border-2 border-slate-800'
                          : 'bg-slate-950 border-2 border-emerald-500/50'
                      } ${isWinningCell ? 'scale-105 ring-4 ring-emerald-500 bg-slate-900' : ''}`}
                    >
                      {cell && (
                        <span
                          className={`inline-flex items-center justify-center leading-none text-3xl sm:text-4xl font-extrabold select-none transition-transform duration-200 ${
                            cell === 'X'
                              ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                              : 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]'
                          }`}
                        >
                          {cell}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {result?.line && result.line.length === 3 && (
                <div
                  className={`absolute bg-emerald-500 shadow-[0_0_15px_#10b981] rounded-full transition-all duration-700 ease-out animate-pulse z-20 pointer-events-none ${getLineClass(
                    result.line
                  )}`}
                />
              )}
            </div>

            {/* Play Again & Leave Game Controls */}
            <div className="flex flex-col items-center space-y-2.5">
              <button
                onClick={() => setConfirmModal({ isOpen: true, type: 'NEXT_MATCH' })}
                className="w-full max-w-xs py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again (Deduct 10 Coins) 🎮</span>
              </button>

              <button
                onClick={() => setConfirmModal({ isOpen: true, type: 'LEAVE_GAME' })}
                className="w-full max-w-xs py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Game</span>
              </button>
            </div>
          </>
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
  );
}
