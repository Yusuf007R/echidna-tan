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
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    player.queue.shuffle();
    interaction.reply({ content: 'Shuffled the queue.' })
  }
}
