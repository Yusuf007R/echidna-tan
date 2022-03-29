import { CacheType, CommandInteraction, GuildMember } from 'discord.js';

export type options =
  | {
      type: 'string';
      name: string;
      description: string;
      required?: boolean;
      options?: string[];
    }
  | {
      type: 'int';
      name: string;
      description: string;
      required?: boolean;
      min?: number;
      max?: number;
    }
  | {
      type: 'sub-command';
      name: string;
      description: string;
    }
  | {
      type: 'user';
      name: string;
      description: string;
      required?: boolean;
    };

export type commandConfigs = {
  name: string;
  description: string;
  options?: options[];
  voiceChannelOnly?: boolean;
  shouldDefer?: boolean;
};

export class Command {
  name: string;

  description: string;

  options?: options[];

  voiceChannelOnly?: boolean;

  shouldDefer?: boolean;

  constructor(configs: commandConfigs) {
    this.name = configs.name;
    this.description = configs.description;
    this.options = configs.options;
    this.voiceChannelOnly = configs.voiceChannelOnly;
    this.shouldDefer = configs.shouldDefer;
  }

  run(interaction: CommandInteraction<CacheType>): Promise<void> {
    return Promise.resolve();
  }

  canExecute(interaction: CommandInteraction<CacheType>): boolean {
    if (this.voiceChannelOnly) {
      const member = interaction.member as GuildMember;
      if (!member.voice.channel) {
        interaction.reply({
          content: 'You need to be in a voice channel.',
          ephemeral: true,
        });
        return false;
      }
    }
    return true;
  }
}
