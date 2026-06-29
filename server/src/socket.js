// Real-time layer: live common operating picture + MOC-to-MOC collaboration.
//
// Channels model shared collaboration spaces (national ops, regional Zone F,
// intel, SAR, per-command nets). Operators from different MOCs join the same
// channel to share tracks, chat, incidents and taskings in real time.

import { nanoid } from 'nanoid';
import { store } from './store.js';

// channelId -> Map(socketId -> presence)
const presence = new Map();

function presenceList(channelId) {
  const m = presence.get(channelId);
  return m ? Array.from(m.values()) : [];
}

export function setupSockets(io) {
  io.on('connection', (socket) => {
    let identity = { mocId: null, operator: null, channels: [] };

    // Client announces who it is (which MOC / operator it represents).
    socket.on('identify', ({ mocId, operator }) => {
      identity.mocId = mocId;
      identity.operator = operator;
      socket.data.identity = identity;
    });

    socket.on('channel:join', (channelId) => {
      socket.join(channelId);
      if (!presence.has(channelId)) presence.set(channelId, new Map());
      presence.get(channelId).set(socket.id, {
        socketId: socket.id,
        mocId: identity.mocId,
        operator: identity.operator,
      });
      identity.channels.push(channelId);
      io.to(channelId).emit('presence:update', {
        channelId,
        members: presenceList(channelId),
      });
      // Send recent history for the channel on join.
      socket.emit('channel:history', {
        channelId,
        messages: store.messages.filter((m) => m.channelId === channelId).slice(-100),
      });
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(channelId);
      presence.get(channelId)?.delete(socket.id);
      io.to(channelId).emit('presence:update', {
        channelId,
        members: presenceList(channelId),
      });
    });

    // Collaboration chat.
    socket.on('message:send', ({ channelId, author, mocId, text }) => {
      const msg = {
        id: nanoid(8),
        channelId,
        author: author || identity.operator || 'Unknown',
        mocId: mocId || identity.mocId,
        text,
        ts: Date.now(),
      };
      store.messages.push(msg);
      if (store.messages.length > 2000) store.messages.shift();
      io.to(channelId).emit('message:new', msg);
    });

    // Share a track / contact of interest into a channel.
    socket.on('track:share', ({ channelId, mmsi, note, author, mocId }) => {
      io.to(channelId).emit('track:shared', {
        id: nanoid(8), channelId, mmsi, note, author, mocId, ts: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      for (const channelId of identity.channels) {
        presence.get(channelId)?.delete(socket.id);
        io.to(channelId).emit('presence:update', {
          channelId,
          members: presenceList(channelId),
        });
      }
    });
  });
}
