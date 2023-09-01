import {Node, Player, Poru} from 'poru';
import Queue from 'poru/dist/src/guild/Queue';
import {ExtractMethods} from '../DTOs/utils';

export type playerMethods = ExtractMethods<Player>;
export type playerMethodsKey = keyof playerMethods;
const PLAYER_METHODS_TO_LISTEN: playerMethodsKey[] = [
  'play',
  'pause',
  'stop',
  'seekTo',
  'setVolume',
  'setLoop',
];

export type playerData = {
  isPlaying: boolean;
  isPaused: boolean;
  isConnected: boolean;
  loop: 'NONE' | 'TRACK' | 'QUEUE';
  position: number;
  timestamp: number;
  volume: number;
  queue: Queue;
};

export default class CustomPlayer extends Player {
  constructor(poru: Poru, node: Node, options: any) {
    super(poru, node, options);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (PLAYER_METHODS_TO_LISTEN.includes(prop as playerMethodsKey)) {
          console.log(prop, 'called');
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  callMethod<T extends playerMethodsKey>(
    method: T,
    ...args: Parameters<playerMethods[T]>
  ) {
    const methodToCall = this[method] as playerMethods[T];
    // @ts-expect-error
    return methodToCall(...args);
  }

  getPlayerData(): playerData {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isConnected: this.isConnected,
      loop: this.loop,
      position: this.position,
      timestamp: this.timestamp,
      volume: this.volume,
      queue: this.queue,
    };
  }
}
