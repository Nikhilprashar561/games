import { Server, Socket } from 'socket.io';
import { CarromEngine } from '../engine/carrom/CarromEngine';

interface ChessRoom {
  roomId: string;
  players: { socketId: string; userId: string; name: string; color: 'white' | 'black' }[];
  boardFen: string;
  currentTurn: 'white' | 'black';
}

interface SnakeRoomPlayer {
  socketId: string;
  userId: string;
  name: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number; // 1..100
  consecutiveSixes: number;
}

interface SnakeRoom {
  roomId: string;
  players: SnakeRoomPlayer[];
  currentTurnIndex: number;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  winner?: string;
}

const activeChessRooms: Map<string, ChessRoom> = new Map();
const activeSnakeRooms: Map<string, SnakeRoom> = new Map();
const activeCarromEngines: Map<string, CarromEngine> = new Map();

const SNAKES_MAP: Record<number, number> = {
  17: 7,
  54: 34,
  62: 18,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

const LADDERS_MAP: Record<number, number> = {
  4: 14,
  9: 31,
  19: 38,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 96,
};

const COLOR_LIST: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected]: Socket ID ${socket.id}`);

    // Join or Matchmake Chess Game Room
    socket.on('join_chess_room', ({ roomId, user }) => {
      const targetRoomId = roomId || 'chess_global_room';
      socket.join(targetRoomId);

      let room = activeChessRooms.get(targetRoomId);
      if (!room) {
        room = {
          roomId: targetRoomId,
          players: [],
          boardFen: 'start',
          currentTurn: 'white',
        };
        activeChessRooms.set(targetRoomId, room);
      }

      const existingPlayer = room.players.find((p) => p.socketId === socket.id);
      if (!existingPlayer && room.players.length < 2) {
        const assignedColor: 'white' | 'black' = room.players.length === 0 ? 'white' : 'black';
        room.players.push({
          socketId: socket.id,
          userId: user?.id || socket.id,
          name: user?.name || 'Gamer',
          color: assignedColor,
        });
      }

      console.log(`Player ${user?.name || socket.id} joined chess room: ${targetRoomId}`);

      io.to(targetRoomId).emit('chess_room_state', {
        roomId: targetRoomId,
        players: room.players,
        currentTurn: room.currentTurn,
      });
    });

    // Handle Chess Move
    socket.on('chess_move', ({ roomId, move, fen }) => {
      const room = activeChessRooms.get(roomId || 'chess_global_room');
      if (room) {
        room.boardFen = fen;
        room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
        socket.to(roomId).emit('opponent_chess_move', { move, fen, currentTurn: room.currentTurn });
      }
    });

    // Handle Chess Game Over (Win / Draw)
    socket.on('chess_game_over', ({ roomId, winnerColor, winnerName }) => {
      io.to(roomId).emit('chess_game_ended', { winnerColor, winnerName });
    });

    // =========================================================================
    // SERVER-AUTHORITATIVE SNAKE & LADDER MULTIPLAYER ENGINE
    // =========================================================================
    socket.on('snake_join_room', ({ roomId, user }) => {
      const targetRoomId = roomId || 'snake_public_lobby';
      socket.join(targetRoomId);

      let room = activeSnakeRooms.get(targetRoomId);
      if (!room) {
        room = {
          roomId: targetRoomId,
          players: [],
          currentTurnIndex: 0,
          status: 'WAITING',
        };
        activeSnakeRooms.set(targetRoomId, room);
      }

      let player = room.players.find((p) => p.userId === user?.id || p.socketId === socket.id);
      if (!player && room.players.length < 4) {
        const color = COLOR_LIST[room.players.length];
        player = {
          socketId: socket.id,
          userId: user?.id || socket.id,
          name: user?.name || `Player ${room.players.length + 1}`,
          color: color,
          position: 1,
          consecutiveSixes: 0,
        };
        room.players.push(player);
      } else if (player) {
        player.socketId = socket.id; // Reconnect socket update
      }

      if (room.players.length >= 2 && room.status === 'WAITING') {
        room.status = 'PLAYING';
      }

      io.to(targetRoomId).emit('snake_room_state', {
        roomId: targetRoomId,
        players: room.players,
        currentTurn: room.players[room.currentTurnIndex]?.color || 'red',
        status: room.status,
        winner: room.winner,
      });
    });

    socket.on('snake_roll_dice', ({ roomId }) => {
      const targetRoomId = roomId || 'snake_public_lobby';
      const room = activeSnakeRooms.get(targetRoomId);
      if (!room || room.status !== 'PLAYING') return;

      const activePlayer = room.players[room.currentTurnIndex];
      if (!activePlayer || activePlayer.socketId !== socket.id) return; // Strict Turn Control

      const diceVal = Math.floor(Math.random() * 6) + 1;

      // Handle 3 consecutive 6s
      if (diceVal === 6) {
        activePlayer.consecutiveSixes += 1;
        if (activePlayer.consecutiveSixes >= 3) {
          activePlayer.consecutiveSixes = 0;
          room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          io.to(targetRoomId).emit('snake_dice_rolled', {
            diceVal,
            playerColor: activePlayer.color,
            forfeitedThreeSixes: true,
            nextTurn: room.players[room.currentTurnIndex].color,
          });
          return;
        }
      } else {
        activePlayer.consecutiveSixes = 0;
      }

      // Calculate path & final position
      const startPos = activePlayer.position;
      let targetPos = startPos + diceVal;
      let stepPath: number[] = [];
      let isSnake = false;
      let isLadder = false;
      let finalPosition = targetPos;

      if (targetPos > 100) {
        targetPos = startPos;
        finalPosition = startPos;
      } else {
        for (let p = startPos + 1; p <= targetPos; p++) {
          stepPath.push(p);
        }

        if (SNAKES_MAP[targetPos]) {
          isSnake = true;
          finalPosition = SNAKES_MAP[targetPos];
        } else if (LADDERS_MAP[targetPos]) {
          isLadder = true;
          finalPosition = LADDERS_MAP[targetPos];
        }

        activePlayer.position = finalPosition;
      }

      const hasWon = finalPosition === 100;
      if (hasWon) {
        room.status = 'ENDED';
        room.winner = activePlayer.name;
      }

      const grantExtraTurn = diceVal === 6 && !hasWon;
      if (!grantExtraTurn && !hasWon) {
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      }

      io.to(targetRoomId).emit('snake_token_moved', {
        playerColor: activePlayer.color,
        diceVal,
        stepPath,
        finalPosition,
        isSnake,
        isLadder,
        hasWon,
        winnerName: room.winner,
        nextTurn: room.players[room.currentTurnIndex]?.color,
      });
    });

    // =========================================================================
    // SERVER-AUTHORITATIVE CARROM MULTIPLAYER ENGINE
    // =========================================================================
    socket.on('carrom_join_room', ({ roomId, user, entryFee }) => {
      const targetRoomId = roomId || 'carrom_public_arena_1';
      socket.join(targetRoomId);

      let engine = activeCarromEngines.get(targetRoomId);
      if (!engine) {
        engine = new CarromEngine(targetRoomId, entryFee || 25);
        activeCarromEngines.set(targetRoomId, engine);
      }

      const playerId = user?.id || socket.id;
      engine.addPlayer(playerId, user?.name || `Player ${engine.players.length + 1}`);

      io.to(targetRoomId).emit('carrom_room_state', {
        roomId: targetRoomId,
        entryFee: engine.entryFee,
        isGameActive: engine.isGameActive,
        players: engine.players,
        currentTurnId: engine.players[engine.currentTurnIndex]?.id,
        winnerId: engine.winnerId,
      });
    });

    socket.on('carrom_start_match', ({ roomId }) => {
      const targetRoomId = roomId || 'carrom_public_arena_1';
      const engine = activeCarromEngines.get(targetRoomId);
      if (!engine || engine.players.length < 2) return;

      const started = engine.startMatch();
      if (started) {
        io.to(targetRoomId).emit('carrom_match_started', {
          coins: engine.coins,
          players: engine.players,
          currentTurnId: engine.players[engine.currentTurnIndex]?.id,
        });
      }
    });

    socket.on('carrom_take_shot', ({ roomId, userId, strikerX, angle, power }) => {
      const targetRoomId = roomId || 'carrom_public_arena_1';
      socket.to(targetRoomId).emit('carrom_opponent_shot', {
        userId,
        strikerX,
        angle,
        power,
      });
    });

    socket.on('carrom_shot_result', ({ roomId, userId, pocketedTypes, updatedCoinPositions }) => {
      const targetRoomId = roomId || 'carrom_public_arena_1';
      const engine = activeCarromEngines.get(targetRoomId);
      if (!engine) return;

      const result = engine.processShotResult(userId, pocketedTypes || [], updatedCoinPositions || []);
      io.to(targetRoomId).emit('carrom_shot_processed', {
        players: engine.players,
        coins: engine.coins,
        nextTurnId: result.nextTurnId,
        winnerId: result.winnerId,
      });
    });

    // Handle Number Predict Tile Flip Event
    socket.on('number_predict_flip', ({ userId, tileNum, reward }) => {
      console.log(`User ${userId} flipped tile #${tileNum} -> Reward: ${reward}`);
      socket.emit('number_predict_result', { tileNum, reward });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
    });
  });
};
