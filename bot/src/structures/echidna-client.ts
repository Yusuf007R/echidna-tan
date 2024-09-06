import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

import configs from '../config';
import CommandManager from '../managers/command-manager';
import EventManager from '../managers/event-manager';
import DanBooru from './dan-booru';
import EchidnaSingleton from './echidna-singleton';
import MusicPlayer from './music-player';
import TicTacToe from './tic-tac-toe';
import WaifuGenerator from './waifu-generator';

export default class EchidnaClient extends Client {
  clientSingleton = new EchidnaSingleton(this);

  musicPlayer = new MusicPlayer(this);

  ticTacToeManager = new Collection<string, TicTacToe>();

  commandManager = new CommandManager();

  danbooru = new DanBooru();

  waifuGenerator = new WaifuGenerator();

  eventManager = new EventManager();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessages
      ],
      partials:[Partials.Channel]
    });
    this.init();
  }

  init() {
    this.eventManager.init();
    this.login(configs.token);
  }
}
