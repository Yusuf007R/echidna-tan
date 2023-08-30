import {Node, Player, Poru} from 'poru';
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
}
