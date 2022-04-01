import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Stop extends Command {
  constructor() {
    super({
      name: 'stop',
      description: 'Stop the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>, args?: string[]) {
    const player = echidnaClient.musicManager.getOrCreate(interaction.guildId!);
    player.stop(interaction);
  }
}
