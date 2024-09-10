/* eslint-disable @typescript-eslint/no-var-requires */
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders';
import EchidnaSingleton from '@Structures/echidna-singleton';
import { Option } from '@Utils/options-builder';
import { AutocompleteInteraction, CacheType, Collection, CommandInteraction, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import configs from '../config';
import { CmdType, Command } from '../structures/command';

export default class CommandManager {
  commands: Collection<string, { category: string; command: Command }>;

  constructor() {
    this.commands = new Collection<string, { category: string; command: Command }>();
  }

  loadCommands() {
    const commandsRootFolder = join(__dirname, '../commands');
    const commands: { [key: string]: Command[] } = {};
    readdirSync(commandsRootFolder).flatMap((folder) => {
      const commandFolder = join(commandsRootFolder, folder);
      return readdirSync(commandFolder)
        .filter((file) => !RegExp(/\[.*\]/gm).test(file) && (file.endsWith('.ts') || file.endsWith('.js')))
        .map((file) => {
          const commandFile = join(commandFolder, file);
          const Command = require(commandFile).default;
          const cmdObj = new Command();
          if (!commands[commandFolder]) commands[commandFolder] = [];
          commands[commandFolder].push(cmdObj);
        });
    });

    Object.keys(commands).forEach((key) => {
      const command = commands[key];
      command.forEach((cmd) => {
        this.commands.set(cmd.name, {
          category: key.split('/').pop() ?? '',
          command: cmd
        });
      });
    });
    console.log('Commands loaded');
  }

  async registerCommands() {
    const guilds = await EchidnaSingleton.echidna.guilds.fetch();
    const slashCommmandsGuild = this.filterMapCmds(['GUILD', 'BOTH']);
    const slashCommmandsDM = this.filterMapCmds(['DM', 'BOTH']);
    try {
      const requests = guilds.map((guild) =>
        new REST().setToken(configs.token).put(Routes.applicationGuildCommands(configs.clientId, guild.id), {
          body: slashCommmandsGuild
        })
      );

      await new REST().setToken(configs.token).put(Routes.applicationCommands(configs.clientId), {
        body: slashCommmandsDM
      });
      await Promise.all(requests);

      console.log('Successfully registered application commands.');
    } catch (error) {
      console.error(error);
    }
  }

  getCmd(interaction: CommandInteraction<CacheType> | AutocompleteInteraction<CacheType>) {
    const cmd = this.commands.get(interaction.commandName);
    if (!cmd) {
      // console.log(`Cmd not found ${interaction.commandName}`)
      // if (interaction.isRepliable()) interaction.reply('Command not found');
      throw new Error(`Cmd not found ${interaction.commandName}`);
    }
    return cmd;
  }

  async executeCommand(interaction: CommandInteraction<CacheType>) {
    try {
      const cmd = this.getCmd(interaction);
      await cmd.command._run(interaction);
    } catch (error) {
      console.log(error);
      interaction.editReply('An error occured while executing the command.');
    }
  }

  async executeAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
    try {
      const cmd = this.getCmd(interaction);
      await cmd.command.handleAutocomplete(interaction);
    } catch (error) {
      console.log(error);
      interaction?.channel?.send('An error occured while executing the command autocomplete.');
    }
  }

  filterMapCmds(filters: CmdType[]) {
    return this.commands
      .filter((cmd) => filters.includes(cmd.command.cmdType))
      .map(({ command }) => {
        const slash = new SlashCommandBuilder().setName(command.name).setDescription(command.description);

        if ((command._optionsArray as any)?.length) {
          this.optionBuilder(command._optionsArray as any, slash);
        }
        return slash.toJSON();
      });
  }

  async optionBuilder(options: Option[], slash: SlashCommandBuilder | SlashCommandSubcommandBuilder) {
    options.forEach((element) => {
      switch (element.type) {
        case 'string':
          slash.addStringOption((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) option.setRequired(true);
            if (element.choices?.length) {
              option.addChoices(...element.choices.map((e) => ({ name: e, value: e })));
            }

            if (element.autocomplete) option.setAutocomplete(true);
            return option;
          });
          break;
        case 'user':
          slash.addUserOption((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) option.setRequired(true);
            return option;
          });
          break;
        case 'int':
          slash.addIntegerOption((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) option.setRequired(true);
            if (element.min) option.setMinValue(element.min);
            if (element.max) option.setMaxValue(element.max);
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
            if (element.required) option.setRequired(true);
            return option;
          });
          break;
        case 'attachment':
          slash.addAttachmentOption((option) => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) option.setRequired(true);
            return option;
          });
          break;
        default:
          break;
      }
    });
  }
}
