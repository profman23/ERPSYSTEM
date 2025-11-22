import { Socket } from 'socket.io';

export const handleConnection = (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
};
