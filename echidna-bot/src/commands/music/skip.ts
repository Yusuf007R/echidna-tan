import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

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
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    player.stop();
    interaction.reply({ content: 'Skipped the current song.' })
  }
}
