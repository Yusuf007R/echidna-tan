import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Play extends Command {
  constructor() {
    super({
      name: 'play',
      description: 'Play or search a song',
      voiceChannelOnly: true,
      shouldDefer: true,
      options: [
        {
          type: 'string',
          name: 'query',
          description: 'query to search or url to play',
          required: true,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    echidnaClient.musicPlayer.play(interaction);
  }
}
