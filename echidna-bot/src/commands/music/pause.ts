import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Pause extends Command {
  constructor() {
    super({
      name: 'pause',
      description: 'Pause the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    player.pause();
    interaction.reply({ content: 'Paused the current song.' })
  }
}
