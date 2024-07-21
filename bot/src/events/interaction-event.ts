import { CacheType, Interaction } from 'discord.js';
import { DiscordEvent } from '../structures/discord-events';

export default class InteractionEvent extends DiscordEvent {
  constructor() {
    super({ eventName: 'interactionCreate' });
  }

  async run(interaction: Interaction<CacheType>): Promise<void> {
    try {
      if (interaction.isCommand()) {
        await this.echidna.commandManager.executeCommand(interaction);
        return;
      }
    } catch (error: any) {
      if (interaction.isMessageComponent()) {
        interaction.message.reply({
          content: error?.message || 'Internal error, try again later.'
        });

        return;
      }
      interaction.channel?.send(error?.message || 'Internal error, try again later.');
    }
  }
}
