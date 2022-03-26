import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

import { Command } from '../../structures/command';

export default class Skip extends Command {
  constructor() {
    super({
      name: 'skip',
      description: 'Skip the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.skip(interaction);
  }
}
