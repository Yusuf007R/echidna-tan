import { socketLoopMode } from './music-player.event-emitter';
import { socketTrack } from '../structures/track';

export interface ServerToClientEvents {
  play: (queue: socketTrack) => void;
  pause: VoidFunction;
  resume: VoidFunction;
  skip: VoidFunction;
  seek: (time: number) => void;
  stop: VoidFunction;
  queue: (queue: socketTrack[]) => void;
  volume: (volume: number) => void;
  loop: (loop: socketLoopMode) => void;
}

export interface ClientToServerEvents {
  pause: VoidFunction;
  resume: VoidFunction;
  skip: VoidFunction;
  seek: (time: number) => void;
  volume: (time: number) => void;
  loop: (loop: socketLoopMode) => void;
  joinGuild: (guildId: string) => void;
}
