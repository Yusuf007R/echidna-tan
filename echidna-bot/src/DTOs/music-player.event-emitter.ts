import { AudioPlayerStatus } from '@discordjs/voice';
import { EventEmitter } from 'stream';
import { LoopState, MusicSocketData, socketTrack } from '../../../common/DTOs/music-player-socket';

export declare interface MusicPlayerEventEmitter {
  on(event: 'currentTrack', listener: (track: socketTrack) => void): this;
  on(event: 'stop', listener: VoidFunction): this;
  on(event: 'volume', listener: (volume: number) => void): this;
  on(event: 'queue', listener: (tracks: socketTrack[]) => void): this;
  on(event: 'loop', listener: (loop: LoopState) => void): this;
  on(event: 'status', listener: (status: AudioPlayerStatus) => void): this;
  on(event: 'data', listener: (data: MusicSocketData) => void): this;
  on(event: 'partialData', listener: (data: Partial<MusicSocketData>) => void): this;
  on(event: 'trackAdded', listener: (data: socketTrack | socketTrack[]) => void): this;
  on(event: 'trackRemoved', listener: (data: socketTrack | socketTrack[]) => void): this;

  emit(eventName: 'currentTrack', track: socketTrack): boolean;
  emit(eventName: 'stop', ...args: any[]): boolean;
  emit(eventName: 'queue', queue: socketTrack[]): boolean;
  emit(eventName: 'volume', volume: number): boolean;
  emit(eventName: 'loop', loop: LoopState): boolean;
  emit(eventName: 'status', status: AudioPlayerStatus): boolean;
  emit(event: 'data', data: MusicSocketData): boolean;
  emit(event: 'partialData', data: Partial<MusicSocketData>): boolean;
  emit(event: 'trackAdded', data: socketTrack | socketTrack[]): boolean;
  emit(event: 'trackRemoved', data: socketTrack | socketTrack[]): boolean;
}

export class MusicPlayerEventEmitter extends EventEmitter {}
