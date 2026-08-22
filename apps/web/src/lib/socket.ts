import { io, Socket } from 'socket.io-client';

// Bug fix #7: lazy singleton — socket is only created on first use,
// not on module import. This prevents ERR_CONNECTION_REFUSED noise
// when the API server isn't running or pages don't use sockets.
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    _socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
    });
  }
  return _socket;
}

// Proxy object so existing code using `socket.on(...)` continues to work
// without changes — calls are forwarded to the lazy singleton.
export const socket = new Proxy({} as Socket, {
  get(_target, prop: keyof Socket) {
    return (...args: any[]) => {
      const s = getSocket();
      return (s[prop] as Function)(...args);
    };
  },
});
