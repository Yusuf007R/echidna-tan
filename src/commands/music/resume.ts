import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

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
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.resume(interaction);
  }
}
