import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[options]';


export default class Stop extends MusicCommand {
  constructor() {
    super({
      name: 'stop',
      description: 'Stop the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
   this. player?.destroy();
    interaction.reply({content: 'Stopped the current song.'});
  }
}
