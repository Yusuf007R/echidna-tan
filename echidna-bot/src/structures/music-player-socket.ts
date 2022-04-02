import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import MusicPlayer from './music-player';

export class MusicPlayerSocket {
  player: MusicPlayer;

  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

  roomId: string;

  constructor(
    player: MusicPlayer,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    roomId: string,
  ) {
    this.player = player;
    this.socket = socket;
    this.roomId = roomId;
    this.initSocketEmitters();
    this.initSocketListeners();
  }

  initSocketListeners() {
    const { socket } = this;

    socket.on('pause', () => {
      console.log('[Socket] Pause');
      socket.to(this.roomId).emit('pause');
      this.player.audioPlayer?.pause();
    });
    socket.on('resume', () => {
      console.log('[Socket] Resume');
      socket.to(this.roomId).emit('resume');
      this.player.audioPlayer?.unpause();
    });
  }

  initSocketEmitters() {
    this.player.events.on('pause', () => {
      console.log('[Socket] Emit pause');
      this.socket.emit('pause');
    });

    this.player.events.on('resume', () => {
      console.log('[Socket] Emit resume');
      this.socket.emit('resume');
    });
  }
}
