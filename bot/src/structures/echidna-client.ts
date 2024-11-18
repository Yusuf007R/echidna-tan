import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

import { default as config, default as configs } from '@Configs';
import CommandManager from '@Managers/command-manager';
import EventManager from '@Managers/event-manager';
import { eq } from 'drizzle-orm';
import db from 'src/drizzle';
import { echidnaTable } from 'src/drizzle/schema';
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


  async updateEchidna() {
    const echidna = await db.query.echidnaTable.findFirst({ where: eq(echidnaTable.id, config.DISCORD_DB_PROFILE) });
    if (echidna) {
      this.user?.setPresence({
        status: echidna.status,
        activities: [
          {
            name: echidna.activity,
            type: echidna.activityType,
            state: echidna.state ?? undefined
          }
        ]
      });
    }
  }

  async init() {
    this.eventManager.init();
    // sync local db with remote db
    await db.$client.sync();
    this.login(configs.DISCORD_TOKEN);
  }
}
