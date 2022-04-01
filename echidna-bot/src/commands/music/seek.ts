import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Seek extends Command {
  constructor() {
    super({
      name: 'seek',
      description: 'Seek to a specific time in the current song.',
      voiceChannelOnly: true,
      options: [
        {
          type: 'int',
          description: 'The time to seek to.',
          name: 'time',
          required: true,
          min: 0,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicManager.getOrCreate(interaction.guildId!);
    player.seek(interaction);
  }
}
