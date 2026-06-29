import { io } from 'socket.io-client';

// Single shared socket connection. Same-origin; Vite proxies it to the backend.
// Start with HTTP long-polling and upgrade to WebSocket once established — this
// connects reliably even behind proxies that don't forward a raw ws upgrade.
export const socket = io('/', {
  autoConnect: true,
  transports: ['polling', 'websocket'],
});
