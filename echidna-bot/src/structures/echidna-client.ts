import { ActivityType, Client, Collection, GatewayIntentBits } from 'discord.js';

import configs from '../configs';
import CommandManager from '../managers/command-manager';
import DanBooru from './dan-booru';
import MusicPlayer from './music-player';
import TicTacToe from './tic-tac-toe';
import WaifuGenerator from './waifu-generator';

export default class EchidnaClient extends Client {
  musicPlayer = new MusicPlayer(this);

  ticTacToeManager = new Collection<string, TicTacToe>();

  commandManager = new CommandManager();

  danbooru = new DanBooru();

  waifuGenerator = new WaifuGenerator();

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
    });
    this.init();
  }

  init() {
    this.once('ready', () => {
      this.user?.setActivity({
        name: 'with onii-sama',
        type: ActivityType.Competing,
      });
      this.musicPlayer.init(this);
      console.log(`Logged in as ${this.user?.tag}`);
    });

    this.on('error', error => console.log('Client error', error));

    this.on('interactionCreate', async interaction => {
      try {
        if (interaction.isCommand()) {
          this.commandManager.executeCommand(interaction);
          return;
        }
        if (interaction.isStringSelectMenu()) {
          if (interaction.customId === 'music') {
            if (!interaction.guildId) return;
            this.musicPlayer.selectMusic(interaction);
          }
        }
        if (interaction.isButton()) {
          const [type, action, value] = interaction.customId.split('-');

          switch (type) {
            case 'tictactoe':
              if (!interaction.message.interaction?.id) return;
              const tictactoe = this.ticTacToeManager.get(
                interaction.message.interaction.id,
              );
              if (!tictactoe) {
                interaction.reply({content: 'No game found', ephemeral: true});
                return;
              }
              switch (action) {
                case 'game':
                  await tictactoe.handleClick(interaction, value);
                  break;
                case 'request':
                  await tictactoe.startGame(interaction, value);
                  break;
                default:
                  break;
              }
            default:
              break;
          }
        }
      } catch (error: any) {
        if (interaction.isMessageComponent()) {
          interaction.message.reply({
            content: error?.message || 'Internal error, try again later.',
          });

          return;
        }
        interaction.channel?.send(
          error?.message || 'Internal error, try again later.',
        );
      }
    });

    this.login(configs.token);
  }
}
