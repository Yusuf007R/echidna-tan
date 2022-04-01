import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Volume extends Command {
  constructor() {
    super({
      name: 'volume',
      description: 'Set the volume of the music player. (0-100)',
      voiceChannelOnly: true,
      options: [
        {
          type: 'int',
          description: 'The volume to set the music player to.',
          name: 'volume',
          required: true,
          min: 0,
          max: 100,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicManager.getOrCreate(interaction.guildId!);
    player.setVolume(interaction);
  }
}
