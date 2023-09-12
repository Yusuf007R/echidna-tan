/* eslint-disable @typescript-eslint/no-var-requires */
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders';
import {
  CacheType,
  Collection,
  CommandInteraction,
  REST,
  Routes,
} from 'discord.js';
import {readdirSync} from 'fs';
import {join} from 'path';
import configs from '../config';
import {Command, options} from '../structures/command';
import EventOptions from '../structures/event-options';

export default class CommandManager {
  commands: Collection<string, {category: string; command: Command}>;

  constructor() {
    this.commands = new Collection<
      string,
      {category: string; command: Command}
    >();
  }

  loadCommands() {
    const commandsRootFolder = join(__dirname, '../commands');
    const commands: {[key: string]: Command[]} = {};
    const options: {[key: string]: EventOptions} = {};
    readdirSync(commandsRootFolder).flatMap(folder => {
      const commandFolder = join(commandsRootFolder, folder);
      return readdirSync(commandFolder)
        .filter(file => file.endsWith('.ts'))
        .map(file => {
          if (file.includes('options')) {
            const optionsFile = join(commandFolder, file);
            const Options = require(optionsFile).default;
            const optObj = new Options();
            options[commandFolder] = optObj;
            return;
          }
          const commandFile = join(commandFolder, file);
          const Command = require(commandFile).default;
          const cmdObj = new Command();
          if (!commands[commandFolder]) commands[commandFolder] = [];
          commands[commandFolder].push(cmdObj);
        });
    });
    Object.keys(options).forEach(key => {
      const option = options[key];
      const command = commands[key];
      command.forEach(cmd => {
        cmd.pushValidator(option.validators);
      });
    });
    Object.keys(commands).forEach(key => {
      const command = commands[key];
      command.forEach(cmd => {
        this.commands.set(cmd.name, {
          category: key.split('/').pop() ?? '',
          command: cmd,
        });
      });
    });
    console.log('Commands loaded');
  }

  async registerCommands(guilds: string[]) {
    const slashCommmands = this.commands.map(({command}) => {
      const slash = new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);

      if (command.options) {
        this.optionBuilder(command.options, slash);
      }
      return slash.toJSON();
    });

    try {
      const requests = guilds.map(guildId =>
        new REST()
          .setToken(configs.token)
          .put(Routes.applicationGuildCommands(configs.clientId, guildId), {
            body: slashCommmands,
          }),
      );
      await Promise.all(requests);
      console.log('Successfully registered application commands.');
    } catch (error) {
      console.error(error);
    }
  }

  async executeCommand(interaction: CommandInteraction<CacheType>) {
    const cmd = this.commands.get(interaction.commandName);
    if (!cmd) return interaction.reply('Command not found.');
    try {
      cmd.command._run(interaction);
    } catch (error) {
      console.error(error);
      interaction.editReply('An error occured while executing the command.');
    }
  }

  async optionBuilder(
    options: options[],
    slash: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  ) {
    options.forEach(element => {
      switch (element.type) {
        case 'string':
          slash.addStringOption(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            if (element.choices?.length) {
              option.addChoices(
                ...element.choices.map(e => ({name: e, value: e})),
              );
            }
            return option;
          });
          break;
        case 'user':
          slash.addUserOption(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            return option;
          });
          break;
        case 'int':
          slash.addIntegerOption(option => {
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
          slash.addSubcommand(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.options) this.optionBuilder(element.options, option);
            return option;
          });
          break;
        case 'bool':
          slash.addBooleanOption(option => {
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
