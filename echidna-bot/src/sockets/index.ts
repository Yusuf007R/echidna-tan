import { createServer } from 'http';
import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { echidnaClient } from '..';
import { ClientToServerEvents, ServerToClientEvents } from '../DTOs/music-player-socket';
import { MusicPlayerSocket } from '../structures/music-player-socket';

export const httpServer = createServer();

export const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  DefaultEventsMap
>(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('[Socket] Connection established');

  socket.on('joinGuild', (guildId) => {
    console.log(`[Socket] Join guild ${guildId}`);
    socket.join(guildId);
    const player = echidnaClient.musicManager.getOrCreate(guildId);
    if (!player) return;
    const socketPlayer = new MusicPlayerSocket(player, socket, guildId);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

httpServer.listen(3000);
