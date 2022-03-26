import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

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
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.stop(interaction);
  }
}
