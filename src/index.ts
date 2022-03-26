import 'dotenv/config';
import { Client, Collection, Intents } from 'discord.js';

import CommandManager from './managers/command-manager';
import configs from './configs';

import TicTacToe from './structures/tic-tac-toe';
import MusicPlayerManager from './managers/music-player-manager';

export const tictactoeCollection = new Collection<string, TicTacToe>();
export const musicPlayerCollection = new MusicPlayerManager();

export const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES],
  retryLimit: Infinity,
});

client.once('ready', () => {
  client.user?.setActivity({
    name: '/help',
    type: 'COMPETING',
  });
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('error', (error) => console.log('Client error', error));

const commandManager = new CommandManager();

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) commandManager.executeCommand(interaction);
  if (interaction.isSelectMenu()) {
    if (!interaction.guildId) return;
    const player = musicPlayerCollection.get(interaction.guildId);
    if (!player) return;
    player.selectMusic(interaction);
  }
  if (interaction.isButton()) {
    const [type, action, value] = interaction.customId.split('-');
    switch (type) {
      case 'tictactoe':
        if (!interaction.message.interaction?.id) return;
        const tictactoe = tictactoeCollection.get(interaction.message.interaction.id);
        if (!tictactoe) {
          interaction.reply({ content: 'No game found', ephemeral: true });
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

client.login(configs.token);
