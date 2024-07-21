import { Guild } from 'discord.js';
import { DiscordEvent } from '../structures/discord-events';

export default class GuildCreateEvent extends DiscordEvent {
  constructor() {
    super({ eventName: 'guildCreate' });
  }

  async run(_guild: Guild): Promise<void> {
    await this.echidna.commandManager.registerCommands();
  }
}
