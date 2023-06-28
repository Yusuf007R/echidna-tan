import { Collection } from 'discord.js';
import { EventEmitter } from 'stream';
import MusicPlayer from '../structures/music-player';

export default class MusicPlayerManager extends Collection<string, MusicPlayer> {
  events = new EventEmitter();

  initializedSocketListeners = new Collection<string, boolean>();

  constructor() {
    super();
  }

  // getOrCreate(guildId: string): MusicPlayer {
  //   return this.get(guildId) ?? this.create(guildId);
  // }

  // create(guildId: string): MusicPlayer {
  //   const player = new MusicPlayer();
  //   this.events.emit(guildId, player);
  //   this.set(guildId, player);
  //   return player;
  // }

  // initSocketListeners(guildId: string, player: MusicPlayer) {
  //   if (this.initializedSocketListeners.has(guildId)) return;

  //   this.initializedSocketListeners.set(guildId, true);

  //   player.events.eventNames;

  //   player.events.on('status', (status) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[SOCKET] status');
  //     io.to(guildId).emit('partialData', {
  //       status,
  //       currentTime: player.currentTrack?.getCurrentTime() ?? 0,
  //     });
  //   });

  //   player.events.on('volume', (volume) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] Emit volume');
  //     io.in(guildId).emit('volume', volume);
  //   });

  //   player.events.on('loop', (loop) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] Emit loop');
  //     io.in(guildId).emit('loop', loop);
  //   });

  //   player.events.on('currentTrack', (currentTrack) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] emit currentTrack');

  //     io.to(guildId).emit('partialData', {
  //       currentTrack,
  //       currentTime: player.currentTrack?.getCurrentTime() ?? 0,
  //     });
  //   });

  //   player.events.on('queue', (tracks) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] Emit queue');
  //     io.in(guildId).emit('queue', tracks);
  //   });

  //   player.events.on('trackAdded', (data) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] Emit trackAdded');
  //     io.in(guildId).emit('trackAdded', data);
  //   });

  //   player.events.on('trackRemoved', (data) => {
  //     if (!player.alReadyInitalized) return;
  //     console.log('[Socket] Emit trackRemoved');
  //     io.in(guildId).emit('trackRemoved', data);
  //   });

  //   player.events.on('data', (data) => {
  //     console.log('[Socket] Emit data');
  //     io.in(guildId).emit('data', data);
  //   });
  // }

  // removeSocketListeners(guildId: string) {
  //   const player = this.get(guildId);
  //   if (!player) return;
  //   player.events.removeAllListeners();
  //   this.initializedSocketListeners.delete(guildId);
  // }

  remove(guildId: string) {
    const player = this.get(guildId);
    if (!player) return;

    // this.removeSocketListeners(guildId);
    this.delete(guildId);
  }
}
