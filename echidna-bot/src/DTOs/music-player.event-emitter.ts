import { AudioPlayerStatus } from '@discordjs/voice';
import { EventEmitter } from 'stream';
import { socketTrack } from '../structures/track';

export type socketLoopMode = 'none' | 'all' | 'single';

export declare interface MusicPlayerEventEmitter {
  on(event: 'pause', listener: VoidFunction): this;
  on(event: 'resume', listener: VoidFunction): this;
  on(event: 'skip', listener: VoidFunction): this;
  on(event: 'seek', listener: (time: number) => void): this;
  on(event: 'stop', listener: VoidFunction): this;
  on(event: 'volume', listener: (volume: number) => void): this;
  on(event: 'loop', listener: (loop: socketLoopMode) => void): this;

  emit(eventName: 'play', queue: socketTrack): boolean;
  emit(eventName: 'pause', ...args: any[]): boolean;
  emit(eventName: 'resume', ...args: any[]): boolean;
  emit(eventName: 'skip', ...args: any[]): boolean;
  emit(eventName: 'seek', time: number): boolean;
  emit(eventName: 'stop', ...args: any[]): boolean;
  emit(eventName: 'queue', queue: socketTrack[]): boolean;
  emit(eventName: 'volume', volume: number): boolean;
  emit(eventName: 'loop', loop: socketLoopMode): boolean;
  emit(eventName: 'status', status: AudioPlayerStatus): boolean;
}

export class MusicPlayerEventEmitter extends EventEmitter {}
