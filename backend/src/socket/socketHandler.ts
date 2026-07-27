import { Server, Socket } from 'socket.io';

interface ChessRoom {
  roomId: string;
  players: { socketId: string; userId: string; name: string; color: 'white' | 'black' }[];
  boardFen: string;
  currentTurn: 'white' | 'black';
}

const activeChessRooms: Map<string, ChessRoom> = new Map();

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

      // Assign color (first player white, second black)
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

      // Broadcast room state
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
