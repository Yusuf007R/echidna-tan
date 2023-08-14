import { CacheType, Interaction } from 'discord.js';
import { EventValidator, EventValidatorNext } from '../structures/event-validator';

export default class IsInteractionEvent extends EventValidator {
  

  constructor() {
    super({
      name: 'IsInteractionEvent',
      description: 'Events that are interactions.',
    });
  }

  async isValid(interaction: Interaction<CacheType>, next: EventValidatorNext) {
    if (interaction.isCommand()) {
      return next();
    }
  }
}

