


export enum AudioPlayerStatus {
  Idle = "idle",
  Buffering = "buffering",
  Paused = "paused",
  Playing = "playing",
  AutoPaused = "autopaused"
}


export enum LoopState {
  None = 'None',
  Single = 'Single',
  All = 'All',
}

export interface ServerToClientEvents {
  currentTrack: (currentTrack: socketTrack) => void;
  skip: VoidFunction;
  stop: VoidFunction;
  queue: (queue: socketTrack[]) => void;
  volume: (volume: number) => void;
  loop: (loop: LoopState) => void;
  status: (status: AudioPlayerStatus) => void;
  currentTime: (currentTime: number) => void;
  data:(data: MusicSocketData) => void;
  partialData: (data: Partial<MusicSocketData>) => void;
}

export interface ClientToServerEvents {

  joinGuild: (guildId: string) => void;

}
export type socketTrack = {
  id: string;
  url: string;
  duration: number;
  title: string;
  thumbnail?: string;
};

export type MusicSocketData = {
  queue: socketTrack[];
  currentTrack: socketTrack | null;
  loop: LoopState;
  volume: number;
  status: AudioPlayerStatus;
  currentTime: number;
};
