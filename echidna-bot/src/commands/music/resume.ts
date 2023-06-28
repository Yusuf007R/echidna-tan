import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';

export default class Resume extends Command {
  constructor() {
    super({
      name: 'resume',
      description: 'Resume the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    player.pause(false)
    interaction.reply({ content: 'Resumed the current song.' })
  }
}
