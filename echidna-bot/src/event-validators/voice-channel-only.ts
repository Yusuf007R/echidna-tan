import { CacheType, GuildMember, Interaction } from 'discord.js';
import { EventValidator, EventValidatorNext } from '../structures/event-validator';

export default class VoiceChannelOnly extends EventValidator {
  constructor() {
    super({
      name: 'voice-channel-only',
      description: 'Events that can only be used in voice channels.',
      message: 'You must be in a voice channel to use this command.',
    });
  }

  async isValid(interaction: Interaction<CacheType>, next: EventValidatorNext){
    if (!interaction.inGuild()) return;
    if (!(interaction.member as GuildMember).voice.channel) {
      this.sendMessage(interaction);
    }
    next();
  }
}
