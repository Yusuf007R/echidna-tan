import { DiscordEvent } from '@Structures/discord-events';

export default class ReadyEvent extends DiscordEvent<'ready'> {
  constructor() {
    super({ eventName: 'ready', eventType: 'once' });
  }

  async run(): Promise<void> {
    await this.echidna.updateEchidna();
    
    console.log(`Logged in as ${this.echidna.user?.tag}`);

    this.echidna.commandManager.loadCommands();
    this.echidna.commandManager.registerCommands();
  }
}
