import {CacheType, GuildMember, Interaction} from 'discord.js';
import {
  CommandValidator,
  CommandValidatorNext,
} from '../structures/command-validator';

export default class VoiceChannelOnly extends CommandValidator {
  constructor() {
    super({
      name: 'voice-channel-only',
      description: 'Events that can only be used in voice channels.',
      message: 'You must be in a voice channel to use this command.',
    });
  }

  async isValid(
    interaction: Interaction<CacheType>,
    next: CommandValidatorNext,
  ) {
    if (!interaction.inGuild()) return;
    if (!(interaction.member as GuildMember).voice.channel) {
      return this.sendMessage(interaction);
    }
    next();
  }
}
