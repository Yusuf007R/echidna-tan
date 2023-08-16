import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[options]';


export default class Shuffle extends MusicCommand {
  constructor() {
    super({
      name: 'shuffle',
      description: 'Shuffle the queue.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.player?.queue.shuffle();
    interaction.reply({content: 'Shuffled the queue.'});
  }
}
