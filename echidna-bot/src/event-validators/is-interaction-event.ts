import {CacheType, Interaction} from 'discord.js';
import {
  CommandValidator,
  CommandValidatorNext,
} from '../structures/command-validator';

export default class IsInteractionEvent extends CommandValidator {
  constructor() {
    super({
      name: 'IsInteractionEvent',
      description: 'Events that are interactions.',
    });
  }

  async isValid(
    interaction: Interaction<CacheType>,
    next: CommandValidatorNext,
  ) {
    if (interaction.isCommand()) {
      return next();
    }
  }
}
