import {DiscordEvent} from '../structures/discord-events';

export default class ReadyEvent extends DiscordEvent {
  constructor() {
    super({eventName: 'ready', eventType: 'once'});
  }

  async run(): Promise<void> {
    // this.echidna.user?.setActivity({
    //   name: 'with onii-sama',
    //   type: ActivityType.Competing,
    // });
    this.echidna.user?.setStatus('invisible');
    this.echidna.musicPlayer.init(this.echidna);
    console.log(`Logged in as ${this.echidna.user?.tag}`);

    const guilds = this.echidna.guilds.cache.map(guild => guild.id);
    this.echidna.commandManager.loadCommands();
    this.echidna.commandManager.registerCommands(guilds);
  }
}
