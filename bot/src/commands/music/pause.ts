import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[wrapper]';

export default class Pause extends MusicCommand {
  constructor() {
    super({
      name: 'pause',
      description: 'Pause the current song.'
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.player?.node.pause();
    await interaction.reply({ content: 'Paused the current song.' });
  }
}
