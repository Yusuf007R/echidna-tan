import 'dotenv/config';
import { Client, Intents } from 'discord.js';

import CommandManager from './managers/command-manager';
import configs from './configs';
import MusicPlayer from './structures/music-player';

export const player = new MusicPlayer();

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

  if (interaction.isSelectMenu()) player.selectMusic(interaction);
});

client.login(configs.token);
