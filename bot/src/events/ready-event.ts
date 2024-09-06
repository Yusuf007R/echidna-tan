import { ActivityType } from 'discord.js';
import { DiscordEvent } from '../structures/discord-events';

export default class ReadyEvent extends DiscordEvent<'ready'> {
  constructor() {
    super({ eventName: 'ready', eventType: 'once' });
  }

  async run(): Promise<void> {
    this.echidna.user?.setActivity({
      name: 'with onii-sama',
      type: ActivityType.Competing
    });
    this.echidna.user?.setStatus('online');

    console.log(`Logged in as ${this.echidna.user?.tag}`);

    this.echidna.commandManager.loadCommands();
    this.echidna.commandManager.registerCommands();
  }
}
