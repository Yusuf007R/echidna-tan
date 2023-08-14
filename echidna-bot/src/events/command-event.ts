import { CacheType, Interaction } from 'discord.js';
import { DiscordEvent } from '../structures/discord-events';

export default class CommandEvent extends DiscordEvent {
  constructor() {
    super({eventName: 'interactionCreate'});
  }

  async run(interaction:Interaction<CacheType> ): Promise<void> {

  } 
}
