'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Bot, Users, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

type BoardState = Array<string | null>;

export default function TicTacToePage() {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [vsAI, setVsAI] = useState<boolean>(true);
  const [scores, setScores] = useState({ x: 0, o: 0, draws: 0 });

  const calculateWinner = (squares: BoardState) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],           // Diagonals
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

  const makeAIMove = (currentBoard: BoardState) => {
    const emptyIndices: number[] = [];
    currentBoard.forEach((cell, idx) => {
      if (cell === null) emptyIndices.push(idx);
    });

    if (emptyIndices.length === 0) return;

    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const newBoard = [...currentBoard];
    newBoard[randomIndex] = 'O';
    setBoard(newBoard);
    setIsXNext(true);

    const winCheck = calculateWinner(newBoard);
    if (winCheck?.winner === 'O') {
      setScores((prev) => ({ ...prev, o: prev.o + 1 }));
    } else if (winCheck?.winner === 'Draw') {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    }
  };

  const handleClick = (index: number) => {
    if (board[index] || result) return;

    const newBoard = [...board];
    const currentPlayer = isXNext ? 'X' : 'O';
    newBoard[index] = currentPlayer;
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
      setIsXNext(!isXNext);
      if (vsAI && isXNext) {
        setTimeout(() => makeAIMove(newBoard), 350);
      }
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  // Determine line direction & coordinates for animated strike-through line
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-emerald-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Games</span>
      </Link>

      {/* Main Container: Pure High-Contrast Dark & White Theme inside Tic Tac Toe */}
      <div className="rounded-3xl p-6 sm:p-10 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white shadow-2xl transition-colors duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-black/20 dark:border-white/20">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Free Play Game</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Space_Grotesk']">
              Tic Tac Toe
            </h1>
          </div>

          <div className="flex items-center bg-black/5 dark:bg-white/10 p-1.5 rounded-2xl border border-black/20 dark:border-white/20">
            <button
              onClick={() => {
                setVsAI(true);
                resetGame();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vsAI
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>vs Computer</span>
            </button>
            <button
              onClick={() => {
                setVsAI(false);
                resetGame();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !vsAI
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2 Players</span>
            </button>
          </div>
        </div>

        {/* Pure Black & White Score Board */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto text-center font-['Space_Grotesk']">
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-xs font-black uppercase tracking-wider">Player X</p>
            <p className="text-2xl font-black mt-0.5">{scores.x}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-xs font-black uppercase tracking-wider">Draws</p>
            <p className="text-2xl font-black mt-0.5">{scores.draws}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20">
            <p className="text-xs font-black uppercase tracking-wider">
              {vsAI ? 'Bot (O)' : 'Player O'}
            </p>
            <p className="text-2xl font-black mt-0.5">{scores.o}</p>
          </div>
        </div>

        {/* Turn State / Winner Banner */}
        <div className="text-center mb-8">
          {result ? (
            <div className="inline-flex items-center space-x-2 px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-lg shadow-xl animate-bounce border border-black dark:border-white">
              <Trophy className="w-5 h-5" />
              <span>
                {result.winner === 'Draw' ? "Game Ended in a Draw!" : `Player ${result.winner} Won! 🎉`}
              </span>
            </div>
          ) : (
            <p className="text-base font-bold">
              Current Turn:{' '}
              <span className="font-black underline uppercase">
                {isXNext ? 'Player X' : vsAI ? 'Computer thinking...' : 'Player O'}
              </span>
            </p>
          )}
        </div>

        {/* 3x3 Grid: Pure Dark/White Styling with Animated Winning Line Stroke */}
        <div className="relative max-w-xs sm:max-w-sm mx-auto aspect-square mb-8">
          
          {/* Grid Squares */}
          <div className="w-full h-full grid grid-cols-3 gap-3">
            {board.map((cell, idx) => {
              const isWinningCell = result?.line.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleClick(idx)}
                  className={`rounded-2xl text-4xl sm:text-6xl font-black flex items-center justify-center transition-all duration-300 shadow-lg select-none ${
                    cell === null
                      ? 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border-2 border-black/20 dark:border-white/20 hover:scale-105'
                      : 'bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white'
                  } ${isWinningCell ? 'scale-105 ring-4 ring-emerald-500' : ''}`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Animated Line Overlay when 3-in-a-row is formed */}
          {result?.line && result.line.length === 3 && (
            <div
              className={`absolute bg-emerald-500 shadow-[0_0_15px_#10b981] rounded-full transition-all duration-700 ease-out animate-pulse z-20 pointer-events-none ${getLineClass(
                result.line
              )}`}
            />
          )}

        </div>

        {/* Reset Action */}
        <div className="flex justify-center">
          <button
            onClick={resetGame}
            className="px-8 py-3.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-black text-sm border-2 border-black dark:border-white hover:opacity-90 transition-all flex items-center space-x-2 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Tic Tac Toe Board</span>
          </button>
        </div>

      </div>
    </div>
  );
}
