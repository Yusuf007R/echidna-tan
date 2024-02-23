import {Command} from '@Structures/command';
import GifResize from '@Structures/gif-resize';
import {CacheType, CommandInteraction} from 'discord.js';

export default class GifResizeCommand extends Command {
  constructor() {
    super({
      name: 'gif-resize',
      description: 'Resize a gif',
      options: [
        {
          type: 'int',
          name: 'width',
          description: 'The width of the gif',
          required: true,
          min: 1,
        },
        {
          type: 'int',
          name: 'height',
          description: 'The height of the gif',
          min: 1,
        },
      ],
      cmdType: 'BOTH',
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const gifResized = new GifResize();

    const width = this.choices.getNumber('width', true);
    const height = this.choices.getNumber('height', false);

    await gifResized.manageInteraction(interaction, {width, height});
  }
}
