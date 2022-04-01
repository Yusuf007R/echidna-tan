import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class NowPlaying extends Command {
  constructor() {
    super({
      name: 'now-playing',
      description: 'Get current song information.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicManager.getOrCreate(interaction.guildId!);
    player.nowPlaying(interaction);
  }
}
