'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, User, Trophy, Sparkles, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getRandomOpponentName } from '../../../utils/realPlayers';

type BoardState = Array<string | null>;

export default function TicTacToePage() {
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
      } else if (winCheck?.winner === 'Draw') {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      }
    }, 1500); // 1.5s Realistic Human Strategic Thinking Latency
  };

  const handleClick = (index: number) => {
    if (board[index] || result || isOpponentThinking || !isXNext) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const winCheck = calculateWinner(newBoard);

    if (winCheck?.winner) {
      if (winCheck.winner === 'X') {
        setScores((prev) => ({ ...prev, x: prev.x + 1 }));
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } else if (winCheck.winner === 'O') {
        setScores((prev) => ({ ...prev, o: prev.o + 1 }));
      } else {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      }
    } else {
      setIsXNext(false);
      makeOpponentMove(newBoard);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setIsOpponentThinking(false);
    setOpponentName(getRandomOpponentName());
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
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Games</span>
      </Link>

      <div className="rounded-3xl p-6 sm:p-8 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white shadow-2xl transition-colors duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-black/20 dark:border-white/20">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Space_Grotesk']">
              Tic Tac Toe Pro
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <User className="w-4 h-4" />
            <span>Matched: {opponentName}</span>
          </div>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-sm mx-auto text-center font-['Space_Grotesk']">
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-[11px] font-black uppercase">You (X)</p>
            <p className="text-xl font-black">{scores.x}</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-[11px] font-black uppercase">Draws</p>
            <p className="text-xl font-black">{scores.draws}</p>
          </div>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-[11px] font-black uppercase">{opponentName} (O)</p>
            <p className="text-xl font-black">{scores.o}</p>
          </div>
        </div>

        {/* Turn State Banner */}
        <div className="text-center mb-6 h-10 flex items-center justify-center">
          {result ? (
            <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-base shadow-xl animate-bounce border border-black dark:border-white">
              <Trophy className="w-4 h-4" />
              <span>{result.winner === 'Draw' ? "It's a Draw!" : result.winner === 'X' ? 'You Won! 🎉' : `${opponentName} Won!`}</span>
            </div>
          ) : isOpponentThinking ? (
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{opponentName} is evaluating strategy...</span>
            </div>
          ) : (
            <p className="text-xs font-bold uppercase tracking-wider">
              Turn: <span className="underline font-black">{isXNext ? 'Your Turn (X)' : `${opponentName}'s Turn`}</span>
            </p>
          )}
        </div>

        {/* 3x3 Grid */}
        <div className="relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] mx-auto aspect-square mb-6">
          <div className="w-full h-full grid grid-cols-3 gap-2.5">
            {board.map((cell, idx) => {
              const isWinningCell = result?.line.includes(idx);
              return (
                <button
                  key={idx}
                  disabled={isOpponentThinking || !!cell || !!result}
                  onClick={() => handleClick(idx)}
                  className={`rounded-2xl text-2xl sm:text-4xl font-black flex items-center justify-center transition-all duration-200 select-none shadow-md ${
                    cell === null
                      ? 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border-2 border-black/20 dark:border-white/20'
                      : 'bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white'
                  } ${isWinningCell ? 'scale-105 ring-4 ring-emerald-500' : ''}`}
                >
                  {cell}
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

        <div className="flex justify-center">
          <button
            onClick={resetGame}
            className="px-6 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-black text-xs border-2 border-black dark:border-white hover:opacity-90 transition-all flex items-center space-x-2 shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Board</span>
          </button>
        </div>

      </div>
    </div>
  );
}
