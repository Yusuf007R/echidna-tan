import { CacheType, Interaction } from 'discord.js';
import { CommandValidator, CommandValidatorNext } from '../structures/command-validator';

export default class GuildOnly extends CommandValidator {
  constructor() {
    super({
      name: 'GuildOnly',
      description: 'Events that can only be used in guilds.',
      message: 'This command can only be used in guilds.'
    });
  }

  async isValid(interaction: Interaction<CacheType>, next: CommandValidatorNext) {
    if (!interaction.inGuild()) {
      this.sendMessage(interaction);
    }
    next();
  }
}
