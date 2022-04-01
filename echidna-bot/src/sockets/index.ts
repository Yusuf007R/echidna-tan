import { AudioPlayerStatus } from '@discordjs/voice';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { echidnaClient } from '..';

export const httpServer = createServer();

export const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3001',
  },
});

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.id);
  socket.on('count', () => {
    const player = echidnaClient.musicManager.get('836668163461611591');
    if (player?.audioPlayer?.state.status === AudioPlayerStatus.Paused) {
      player.audioPlayer.unpause();
      return;
    }
    player?.audioPlayer?.pause();
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

httpServer.listen(3000);
