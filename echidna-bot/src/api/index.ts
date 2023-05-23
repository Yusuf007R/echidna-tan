import { createServer } from 'http';
import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import express from 'express';
import cors from 'cors';
import { echidnaClient } from '..';
import { ClientToServerEvents, ServerToClientEvents } from '../../../common/DTOs/music-player-socket';

import player from './routes/player';
import errorHandler from './middlewares/error-handler';
import MusicPlayer from '../structures/music-player';

const app = express();
export const httpServer = createServer(app);

app.use(
  cors({
    origin: '*',
  }),
);

app.use('/player', player);

app.use(errorHandler);

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

  socket.on('joinGuild', async (guildId) => {
    console.log('[Socket] Join guild', guildId);
    socket.join(guildId);

    const player = echidnaClient.musicManager.get(guildId);

    if (player && !echidnaClient.musicManager.initializedSocketListeners.has(guildId)) {
      echidnaClient.musicManager.initSocketListeners(guildId, player);
    }

    if (!echidnaClient.musicManager.initializedSocketListeners.has(guildId)) {
      if (echidnaClient.musicManager.events.listenerCount(guildId) > 0) return;
      echidnaClient.musicManager.events.on(guildId, (player: MusicPlayer) => {
        echidnaClient.musicManager.initSocketListeners(guildId, player);
      });
    } else {
      console.log('[Socket] Already initialized');
      const player = echidnaClient.musicManager.get(guildId);
      if (!player) return;
      console.log('[Socket] Emitting data');
      socket.emit('data', await player.getDataToSocket());
    }
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

httpServer.listen(3000);
