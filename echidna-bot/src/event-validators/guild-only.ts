import { CacheType, Interaction } from 'discord.js';
import { EventValidator, EventValidatorNext } from '../structures/event-validator';

export default class GuildOnly extends EventValidator {
  constructor() {
    super({
      name: 'GuildOnly',
      description: 'Events that can only be used in guilds.',
      message: 'This command can only be used in guilds.',
    });
  }

  async isValid(interaction: Interaction<CacheType>, next:EventValidatorNext){
    if (!interaction.inGuild()) {
      this.sendMessage(interaction);
    }
    next();
  }
}
