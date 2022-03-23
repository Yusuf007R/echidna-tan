import 'dotenv/config';
import { Client, Collection, Intents } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v9';
import { REST } from '@discordjs/rest';

import { Command, CommandLoader } from './utils/command';
import configs from './configs';

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
  console.log('Ready!');
});

const commands = new Collection<string, Command>();

CommandLoader(commands);

const rest = new REST().setToken(configs.token);
const commandsJson = commands.map((command) => new SlashCommandBuilder().setName(command.name).setDescription(command.description).toJSON());

rest
  .put(Routes.applicationGuildCommands(configs.clientId, configs.guildId), {
    body: commandsJson,
  })
  .then(() => console.log('Successfully registered application commands.'))
  .catch(console.error);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  const command = commands.get(commandName);
  if (command) return command.run(interaction, []);
});

client.login(configs.token);
