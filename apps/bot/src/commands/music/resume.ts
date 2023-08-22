import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Resume extends MusicCommand {
  constructor() {
    super({
      name: 'resume',
      description: 'Resume the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.player?.pause(false);
    interaction.reply({content: 'Resumed the current song.'});
  }
}
