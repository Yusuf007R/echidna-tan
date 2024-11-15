import { DiscordEvent } from '@Structures/discord-events';
import { Guild } from 'discord.js';

export default class GuildCreateEvent extends DiscordEvent<'guildCreate'> {
  constructor() {
    super({ eventName: 'guildCreate' });
  }

  async run(_guild: Guild): Promise<void> {
    await this.echidna.commandManager.registerCommands();
  }
}
