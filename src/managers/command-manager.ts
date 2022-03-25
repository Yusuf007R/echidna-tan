import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { CacheType, Collection, CommandInteraction } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import configs from '../configs';
import { Command } from '../structures/command';

export default class CommandManager {
  commands: Collection<string, Command>;

  constructor() {
    this.commands = new Collection<string, Command>();
    this.loadCommands();
    this.registerCommands();
  }

  loadCommands() {
    const commandsRootFolder = join(__dirname, '../commands');
    readdirSync(commandsRootFolder).flatMap((folder) => {
      const commandFolder = join(commandsRootFolder, folder);
      return readdirSync(commandFolder)
        .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
        .map((file) => {
          const commandFile = join(commandFolder, file);
          const Command = require(commandFile).default;
          const command = new Command();
          this.commands.set(command.name, command);
        });
    });
    console.log('Commands loaded');
  }

  async registerCommands() {
    const slashCommmands = this.commands.map((command) => {
      const slash = new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);

      if (command.options) {
        command.options.forEach((element) => {
          if (element.type === 'string') {
            slash.addStringOption((option) => {
              option.setName(element.name).setDescription(element.description);
              if (element.required) {
                option.setRequired(true);
              }
              return option;
            });
          }
        });
      }
      return slash.toJSON();
    });

    try {
      await new REST()
        .setToken(configs.token)
        .put(Routes.applicationGuildCommands(configs.clientId, configs.guildId), {
          body: slashCommmands,
        });
      console.log('Successfully registered application commands.');
    } catch (error) {
      console.error(error);
    }
  }

  async executeCommand(interaction: CommandInteraction<CacheType>) {
    const command = this.commands.get(interaction.commandName);
    if (!command) return interaction.reply('Command not found.');

    try {
      await interaction.deferReply();
      command.run(interaction, []);
    } catch (error) {
      console.log(error);
      interaction.reply('An error occured while executing the command.');
    }
  }
}
