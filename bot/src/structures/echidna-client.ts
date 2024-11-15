import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

import configs from '@Configs';
import CommandManager from '@Managers/command-manager';
import EventManager from '@Managers/event-manager';
import EchidnaSingleton from './echidna-singleton';
import MusicPlayer from './music-player';
import TicTacToe from './tic-tac-toe';

export default class EchidnaClient extends Client {
  clientSingleton = new EchidnaSingleton(this);

  musicPlayer = new MusicPlayer(this);

  ticTacToeManager = new Collection<string, TicTacToe>();

  commandManager = new CommandManager();

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
      partials: [Partials.Channel]
    });
    this.init();
  }

  init() {
    this.eventManager.init();
    this.login(configs.DISCORD_TOKEN);
  }
}
