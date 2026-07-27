import { Server, Socket } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected]: User ID ${socket.id}`);

    // Join Game Room
    socket.on('join_game', ({ gameId, user }) => {
      socket.join(gameId);
      console.log(`User ${user?.name || socket.id} joined game room: ${gameId}`);
      socket.to(gameId).emit('player_joined', { user, socketId: socket.id });
    });

    // Handle Game Move Signal
    socket.on('game_move', ({ gameId, moveData }) => {
      socket.to(gameId).emit('opponent_move', moveData);
    });

    // Handle Chat Messages in Game Room
    socket.on('send_message', ({ gameId, message, user }) => {
      io.to(gameId).emit('new_message', { message, user, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
    });
  });
};
