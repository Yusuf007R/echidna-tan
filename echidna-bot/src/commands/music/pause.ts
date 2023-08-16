import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Pause extends MusicCommand {
  constructor() {
    super({
      name: 'pause',
      description: 'Pause the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.player?.pause();
    interaction.reply({content: 'Paused the current song.'});
  }
}
