import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import {
  CacheType, Collection, CommandInteraction, GuildMember,
} from 'discord.js';
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
          switch (element.type) {
            case 'string':
              slash.addStringOption((option) => {
                option.setName(element.name).setDescription(element.description);
                if (element.required) {
                  option.setRequired(true);
                }
                if (element.options?.length) {
                  element.options.forEach((opt) => option.addChoice(opt, opt));
                }
                return option;
              });
              break;
            case 'user':
              slash.addUserOption((option) => {
                option.setName(element.name).setDescription(element.description);
                if (element.required) {
                  option.setRequired(true);
                }
                return option;
              });
              break;
            case 'int':
              slash.addIntegerOption((option) => {
                option.setName(element.name).setDescription(element.description);
                if (element.required) {
                  option.setRequired(true);
                }
                if (element.min) {
                  option.setMinValue(element.min);
                }
                if (element.max) {
                  option.setMaxValue(element.max);
                }
                return option;
              });
              break;

            case 'sub-command':
              slash.addSubcommand((option) => {
                option.setName(element.name).setDescription(element.description);
                return option;
              });
              break;
            default:
              break;
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
      if (!command.canExecute(interaction)) return;
      if (command.shouldDefer) await interaction.deferReply();
      command.run(interaction);
    } catch (error) {
      console.log(error);
      interaction.reply('An error occured while executing the command.');
    }
  }
}
