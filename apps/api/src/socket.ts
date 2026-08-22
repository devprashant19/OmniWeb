import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function initSocket(server: any) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('subscribe_run', (runId) => {
      socket.join(`run_${runId}`);
    });
    socket.on('subscribe_healing', () => {
      socket.join('healing_events');
    });
  });
}

export function getSocket() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
