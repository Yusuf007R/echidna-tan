import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import { CacheType, Collection, CommandInteraction, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import configs from '../configs';
import { Command, options } from '../structures/command';

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
          const cmdObj = new Command();
          this.commands.set(cmdObj.name, cmdObj);
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
        this.optionBuilder(command.options, slash);
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
      console.error(error);
      interaction.editReply('An error occured while executing the command.');
    }
  }

  async optionBuilder(
    options: options[],
    slash: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  ) {
    options.forEach((element) => {
      switch (element.type) {
        case 'string':
          slash.addStringOption((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            if (element.choices?.length) {
              option.addChoices(...element.choices.map(e=>({name:e, value:e})))
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
          if (!(slash instanceof SlashCommandBuilder)) return;
          slash.addSubcommand((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.options) this.optionBuilder(element.options, option);
            return option;
          });
          break;
        case 'bool':
          slash.addBooleanOption((option) => {
            option.setName(element.name).setDescription(element.description);
            return option;
          });
          break;
        default:
          break;
      }
    });
  }
}
