import { CacheType, CommandInteraction } from 'discord.js';
import { player } from '../..';
import { Command, options } from '../../structures/command';

export default class Play implements Command {
  name = 'play';

  description = 'Play or search a song';

  options: options[] = [
    {
      type: 'string',
      name: 'query',
      description: 'query to search or url to play',
      required: true,
    },
  ];

  async run(interaction: CommandInteraction<CacheType>) {
    player.play(interaction);
  }
}
