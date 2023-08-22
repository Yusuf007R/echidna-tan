import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Skip extends MusicCommand {
  constructor() {
    super({
      name: 'skip',
      description: 'Skip the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.player?.stop();
    interaction.reply({content: 'Skipped the current song.'});
  }
}
