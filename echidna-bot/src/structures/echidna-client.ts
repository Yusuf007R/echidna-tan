import {ActivityType, Client, Collection, GatewayIntentBits} from 'discord.js';
import configs from '../configs';
import CommandManager from '../managers/command-manager';
import MusicPlayerManager from '../managers/music-player-manager';
import {io} from '../api/index';
import DanBooru from './dan-booru';
import TicTacToe from './tic-tac-toe';

export default class EchidnaClient extends Client {
  musicManager = new MusicPlayerManager();

  ticTacToeManager = new Collection<string, TicTacToe>();

  commandManager = new CommandManager();

  danbooru = new DanBooru();

  io = io;

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    this.init();
  }

  init() {
    this.once('ready', () => {
      this.user?.setActivity({
        name: 'with onii-sama',
        type: ActivityType.Competing,
      });
      console.log(`Logged in as ${this.user?.tag}`);
    });

    this.on('error', error => console.log('Client error', error));

    this.on('interactionCreate', async interaction => {
      if (interaction.isCommand())
        this.commandManager.executeCommand(interaction);
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'music') {
          if (!interaction.guildId) return;
          const player = this.musicManager.get(interaction.guildId);
          if (!player) return;
          player.selectMusic(interaction);
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
    });

    this.login(configs.token);
  }
}
