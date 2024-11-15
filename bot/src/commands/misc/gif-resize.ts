import { Command } from '@Structures/command';
import GifResize from '@Structures/gif-resize';
import { OptionsBuilder } from '@Utils/options-builder';
import { CacheType, CommandInteraction } from 'discord.js';

const options = new OptionsBuilder()
  .addIntOption({
    name: 'width',
    description: 'The width of the gif',
    required: true,
    min: 1
  })
  .addIntOption({
    name: 'height',
    description: 'The height of the gif',
    min: 1
  })
  .build();

export default class GifResizeCommand extends Command<typeof options> {
  constructor() {
    super({
      name: 'gif-resize',
      description: 'Resize a gif',
      options,
      cmdType: 'BOTH'
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const gifResized = new GifResize();

    const width = this.options.width;
    const height = this.options.height;

    await gifResized.manageInteraction(interaction, { width, height });
  }
}
