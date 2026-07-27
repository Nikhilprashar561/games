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
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } else if (winCheck.winner === 'O') {
        setScores((prev) => ({ ...prev, o: prev.o + 1 }));
      } else {
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      }
    } else {
      setIsXNext(!isXNext);
      if (vsAI && isXNext) {
        setTimeout(() => makeAIMove(newBoard), 400);
      }
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
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

      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Free Play Game</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
              Tic Tac Toe Arena
            </h1>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setVsAI(true);
                resetGame();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                vsAI
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>vs AI Bot</span>
            </button>
            <button
              onClick={() => {
                setVsAI(false);
                resetGame();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !vsAI
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2 Players</span>
            </button>
          </div>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto text-center">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase">Player X</p>
            <p className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">{scores.x}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20">
            <p className="text-xs font-bold text-slate-500 uppercase">Draws</p>
            <p className="text-2xl font-extrabold text-slate-500">{scores.draws}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
              {vsAI ? 'Bot (O)' : 'Player O'}
            </p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{scores.o}</p>
          </div>
        </div>

        {/* Winner Banner / Turn State */}
        <div className="text-center mb-6">
          {result ? (
            <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-lg animate-bounce">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span>
                {result.winner === 'Draw' ? "It's a Draw!" : `Player ${result.winner} Wins! 🎉`}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Current Turn:{' '}
              <span className={isXNext ? 'text-cyan-500 font-bold' : 'text-rose-500 font-bold'}>
                {isXNext ? 'Player X' : vsAI ? 'Computer thinking...' : 'Player O'}
              </span>
            </p>
          )}
        </div>

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-xs sm:max-w-sm mx-auto aspect-square mb-8">
          {board.map((cell, idx) => {
            const isWinningCell = result?.line.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleClick(idx)}
                className={`rounded-2xl text-4xl sm:text-5xl font-black flex items-center justify-center transition-all duration-200 shadow-md ${
                  cell === null
                    ? 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700'
                    : cell === 'X'
                    ? 'bg-cyan-500/10 text-cyan-500 border-2 border-cyan-500/40'
                    : 'bg-rose-500/10 text-rose-500 border-2 border-rose-500/40'
                } ${isWinningCell ? 'ring-4 ring-amber-400 bg-amber-400/20' : ''}`}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={resetGame}
            className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Board</span>
          </button>
        </div>

      </div>
    </div>
  );
}
