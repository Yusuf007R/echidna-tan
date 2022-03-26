import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

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
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.pause(interaction);
  }
}
