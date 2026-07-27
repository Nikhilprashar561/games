'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, RotateCcw, Clock, ShieldCheck, Zap } from 'lucide-react';

const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const PIECE_SYMBOLS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

export default function ChessPage() {
  const [board, setBoard] = useState<string[][]>(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const handleSquareClick = (r: number, c: number) => {
    if (selectedSquare) {
      const [sr, sc] = selectedSquare;
      if (sr === r && sc === c) {
        setSelectedSquare(null);
        return;
      }

      const piece = board[sr][sc];
      const newBoard = board.map((row) => [...row]);
      newBoard[r][c] = piece;
      newBoard[sr][sc] = '';

      setBoard(newBoard);
      setSelectedSquare(null);
      const nextTurn = turn === 'white' ? 'black' : 'white';
      setTurn(nextTurn);

      const colLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const moveStr = `${piece.toUpperCase()}${colLetters[sc]}${8 - sr} ➔ ${colLetters[c]}${8 - r}`;
      setMoveHistory((prev) => [moveStr, ...prev]);
    } else {
      if (board[r][c] !== '') {
        setSelectedSquare([r, c]);
      }
    }
  };

  const resetBoard = () => {
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setTurn('white');
    setMoveHistory([]);
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

        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protected Arena</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                Grandmaster Chess
              </h1>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="flex items-center space-x-1 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Zap className="w-3.5 h-3.5" />
                <span>Live Table #1</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-8 flex flex-col items-center">
              
              <div className="w-full max-w-md flex items-center justify-between px-4 py-2.5 mb-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700"></div>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Opponent (Black)</span>
                </div>
                <div className="flex items-center space-x-1 text-xs font-mono font-bold text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>10:00</span>
                </div>
              </div>

              <div className="w-full max-w-md aspect-square border-4 border-slate-800 dark:border-slate-900 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-8">
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        className={`relative flex items-center justify-center text-3xl sm:text-4xl transition-colors duration-150 select-none ${
                          isSelected
                            ? 'bg-amber-400/80'
                            : isDark
                            ? 'bg-[#b58863] text-[#f0d9b5]'
                            : 'bg-[#f0d9b5] text-[#b58863]'
                        }`}
                      >
                        {cell ? (
                          <span className={cell === cell.toUpperCase() ? 'text-slate-100 drop-shadow-md' : 'text-slate-900 drop-shadow-md'}>
                            {PIECE_SYMBOLS[cell]}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="w-full max-w-md flex items-center justify-between px-4 py-2.5 mt-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-400"></div>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">You (White)</span>
                </div>
                <div className="flex items-center space-x-1 text-xs font-mono font-bold text-emerald-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>09:42</span>
                </div>
              </div>

            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Turn State</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    turn === 'white' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {turn}'s Turn
                  </span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Move Log</h3>
                  <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300 pr-2">
                    {moveHistory.length === 0 ? (
                      <p className="text-slate-400 italic">No moves played yet.</p>
                    ) : (
                      moveHistory.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                          <span className="text-slate-400">#{moveHistory.length - idx}</span>
                          <span className="font-bold">{m}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={resetBoard}
                  className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Chess Board</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
