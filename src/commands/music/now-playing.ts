import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

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
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.nowPlaying(interaction);
  }
}
