'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { ArrowLeft, RotateCcw, Clock, ShieldCheck, Zap, Coins, Trophy, Bot, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';

type Piece = {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
};

type SquareContent = Piece | null;
type BoardMatrix = SquareContent[][];

const INITIAL_BOARD: BoardMatrix = [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' },
  ],
  Array(8).fill({ type: 'p', color: 'b' }),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill({ type: 'p', color: 'w' }),
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' },
  ],
];

const PIECE_UNICODE: Record<string, string> = {
  w_k: '♔', w_q: '♕', w_r: '♖', w_b: '♗', w_n: '♘', w_p: '♙',
  b_k: '♚', b_q: '♛', b_r: '♜', b_b: '♝', b_n: '♞', b_p: '♟',
};

export default function ChessPage() {
  const { user, updateUserCoins } = useAuth();
  const ENTRY_COST = 10;
  const WIN_REWARD = 20;

  const [board, setBoard] = useState<BoardMatrix>(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [playerSide, setPlayerSide] = useState<'w' | 'b'>('w'); // 'w' or 'b'
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [hasPaidEntry, setHasPaidEntry] = useState<boolean>(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const computerSide = playerSide === 'w' ? 'b' : 'w';

  // Initialize Socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const s = io(socketUrl, { transports: ['websocket', 'polling'] });
    setSocket(s);

    if (user) {
      s.emit('join_chess_room', { roomId: 'chess_room_global', user });
    }

    return () => {
      s.disconnect();
    };
  }, [user]);

  // Compute legal moves for a piece
  const calculateValidMovesForPiece = (r: number, c: number, piece: Piece, currentBoard: BoardMatrix): [number, number][] => {
    const moves: [number, number][] = [];
    const color = piece.color;
    const opponent = color === 'w' ? 'b' : 'w';

    const addMoveIfValid = (nr: number, nc: number) => {
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
      if (r + dir >= 0 && r + dir < 8 && !currentBoard[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !currentBoard[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }
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
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      knightOffsets.forEach(([dr, dc]) => {
        addMoveIfValid(r + dr, c + dc);
      });
    } else if (piece.type === 'r' || piece.type === 'q') {
      const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      straightDirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMoveIfValid(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'b' || piece.type === 'q') {
      const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      diagDirs.forEach(([dr, dc]) => {
        let step = 1;
        while (addMoveIfValid(r + dr * step, c + dc * step)) step++;
      });
    }

    if (piece.type === 'k') {
      const kingDirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      kingDirs.forEach(([dr, dc]) => addMoveIfValid(r + dr, c + dc));
    }

    return moves;
  };

  // Computer AI turn trigger
  useEffect(() => {
    if (!hasPaidEntry || gameWinner) return;

    if (turn === computerSide) {
      const timer = setTimeout(() => {
        makeComputerAIMove();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [turn, hasPaidEntry, gameWinner, computerSide, board]);

  // Execute Computer AI move
  const makeComputerAIMove = () => {
    const allComputerMoves: { from: [number, number]; to: [number, number]; piece: Piece; target: SquareContent }[] = [];

    board.forEach((row, r) => {
      row.forEach((piece, c) => {
        if (piece && piece.color === computerSide) {
          const legal = calculateValidMovesForPiece(r, c, piece, board);
          legal.forEach(([tr, tc]) => {
            allComputerMoves.push({
              from: [r, c],
              to: [tr, tc],
              piece,
              target: board[tr][tc],
            });
          });
        }
      });
    });

    if (allComputerMoves.length === 0) return;

    // Smart priority: capture opponent piece if available, else pick random
    const captures = allComputerMoves.filter((m) => m.target !== null);
    const chosenMove = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : allComputerMoves[Math.floor(Math.random() * allComputerMoves.length)];

    const [fr, fc] = chosenMove.from;
    const [tr, tc] = chosenMove.to;

    const newBoard = board.map((row) => [...row]);
    newBoard[tr][tc] = chosenMove.piece;
    newBoard[fr][fc] = null;

    const colLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const moveStr = `AI ${chosenMove.piece.type.toUpperCase()}${colLetters[fc]}${8 - fr} ➔ ${colLetters[tc]}${8 - tr}`;

    setBoard(newBoard);
    setTurn(playerSide);
    setMoveHistory((prev) => [moveStr, ...prev]);

    if (socket) {
      socket.emit('chess_move', {
        roomId: 'chess_room_global',
        move: { newBoard, moveStr },
        fen: 'updated',
      });
    }

    if (chosenMove.target && chosenMove.target.type === 'k') {
      setGameWinner('Computer AI');
    }
  };

  // Handle entry fee & start game
  const handleStartMatch = async () => {
    if (!user) return;
    if (user.coins < ENTRY_COST) {
      alert(`You need at least ${ENTRY_COST} coins to enter this chess arena!`);
      return;
    }
    await updateUserCoins(-ENTRY_COST);
    setHasPaidEntry(true);
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setValidMoves([]);
    setTurn('w');
    setMoveHistory([]);
    setGameWinner(null);
  };

  // Handle Player Square Click
  const handleSquareClick = async (r: number, c: number) => {
    if (!hasPaidEntry || gameWinner || turn !== playerSide) return;

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

        const newBoard = board.map((row) => [...row]);
        newBoard[r][c] = piece;
        newBoard[sr][sc] = null;

        const colLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const moveStr = `You ${piece.type.toUpperCase()}${colLetters[sc]}${8 - sr} ➔ ${colLetters[c]}${8 - r}`;

        setBoard(newBoard);
        setSelectedSquare(null);
        setValidMoves([]);
        setTurn(computerSide);
        setMoveHistory((prev) => [moveStr, ...prev]);

        if (socket) {
          socket.emit('chess_move', {
            roomId: 'chess_room_global',
            move: { newBoard, moveStr },
            fen: 'updated',
          });
        }

        if (targetPiece && targetPiece.type === 'k') {
          const winnerName = user?.name || 'Player';
          setGameWinner(winnerName);
          await updateUserCoins(WIN_REWARD);
          confetti({ particleCount: 120, spread: 80 });
        }
      } else {
        const piece = board[r][c];
        if (piece && piece.color === playerSide) {
          setSelectedSquare([r, c]);
          setValidMoves(calculateValidMovesForPiece(r, c, piece, board));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = board[r][c];
      if (piece && piece.color === playerSide) {
        setSelectedSquare([r, c]);
        setValidMoves(calculateValidMovesForPiece(r, c, piece, board));
      }
    }
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

        {/* Main Chess Arena Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>10 Coins vs Computer</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Space_Grotesk']">
                Chess vs Computer AI
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-sm">
                <Coins className="w-4 h-4" />
                <span>Entry: {ENTRY_COST} Coins | Win: {WIN_REWARD} Coins</span>
              </div>
            </div>
          </div>

          {!hasPaidEntry ? (
            /* Start Match Prompt with Color Theme / Side Selection */
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/20">
                <Bot className="w-10 h-10 animate-bounce" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-['Space_Grotesk']">
                  Choose Your Chess Side Theme!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Select whether you want to play as <span className="font-bold text-amber-500">White (move first)</span> or <span className="font-bold text-emerald-500">Black (Computer moves first)</span>!
                </p>
              </div>

              {/* Side / Color Theme Selector */}
              <div className="flex justify-center items-center gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => setPlayerSide('w')}
                  className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerSide === 'w'
                      ? 'bg-white text-slate-950 border-amber-500 shadow-lg scale-105'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Play White ♔</span>
                </button>

                <button
                  onClick={() => setPlayerSide('b')}
                  className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-sm border-2 transition-all flex items-center justify-center space-x-2 ${
                    playerSide === 'b'
                      ? 'bg-slate-950 text-white border-emerald-500 shadow-lg scale-105'
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
                Pay 10 Coins & Play Chess!
              </button>
            </div>
          ) : (
            /* Active Game Section */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Fixed Grid 8x8 Board Container */}
              <div className="lg:col-span-8 flex flex-col items-center">
                
                {/* Opponent (Computer) Header */}
                <div className="w-full max-w-[420px] flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Computer AI ({computerSide === 'w' ? 'White' : 'Black'})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono font-bold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>10:00</span>
                  </div>
                </div>

                {/* Fixed Grid Dimensions 8x8 Chessboard */}
                <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] border-4 border-slate-800 dark:border-slate-900 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-8 grid-rows-8 bg-slate-900">
                  {board.map((row, r) =>
                    row.map((piece, c) => {
                      const isDarkSquare = (r + c) % 2 === 1;
                      const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                      const isValidTarget = validMoves.some(([vr, vc]) => vr === r && vc === c);

                      return (
                        <button
                          key={`${r}-${c}`}
                          onClick={() => handleSquareClick(r, c)}
                          className={`relative flex items-center justify-center text-3xl sm:text-4xl transition-colors duration-150 select-none overflow-hidden ${
                            isSelected
                              ? 'bg-amber-400/90 text-slate-950'
                              : isValidTarget
                              ? 'bg-emerald-500/40 ring-2 ring-emerald-400'
                              : isDarkSquare
                              ? 'bg-[#b58863] text-[#f0d9b5]'
                              : 'bg-[#f0d9b5] text-[#b58863]'
                          }`}
                        >
                          {piece ? (
                            <span className={piece.color === 'w' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-950 drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]'}>
                              {PIECE_UNICODE[`${piece.color}_${piece.type}`]}
                            </span>
                          ) : null}

                          {isValidTarget && !piece && (
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md"></div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Player Header */}
                <div className="w-full max-w-[420px] flex items-center justify-between px-4 py-2.5 mt-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {user?.name} ({playerSide === 'w' ? 'White ♔' : 'Black ♚'})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono font-bold text-emerald-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>09:42</span>
                  </div>
                </div>

              </div>

              {/* Controls & Status Panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
                  
                  {gameWinner ? (
                    <div className="p-4 rounded-2xl bg-amber-500/20 text-amber-500 font-extrabold text-base flex flex-col items-center justify-center space-y-1 text-center animate-bounce">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>{gameWinner} Wins!</span>
                      </div>
                      {gameWinner !== 'Computer AI' ? (
                        <span className="text-xs text-emerald-400">+20 Coins Credited!</span>
                      ) : (
                        <span className="text-xs text-rose-400">Better luck next time!</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Turn State</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        turn === playerSide ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {turn === playerSide ? 'Your Turn' : 'Computer AI Thinking...'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Computer Match Active</span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Move Log</h3>
                    <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300 pr-2">
                      {moveHistory.length === 0 ? (
                        <p className="text-slate-400 italic">Select your piece to move.</p>
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
                    onClick={handleStartMatch}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Match (10 Coins)</span>
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
