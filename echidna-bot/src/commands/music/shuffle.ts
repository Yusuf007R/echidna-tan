import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Shuffle extends Command {
  constructor() {
    super({
      name: 'shuffle',
      description: 'Shuffle the queue.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicManager.getOrCreate(interaction.guildId!);
    player.shuffle(interaction);
  }
}
