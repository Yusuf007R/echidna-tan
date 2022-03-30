import { CacheType, CommandInteraction } from 'discord.js';
import { musicPlayerCollection } from '../..';

import { Command } from '../../structures/command';

export default class Loop extends Command {
  constructor() {
    super({
      name: 'loop',
      description: 'Set the loop mode of the player.',
      voiceChannelOnly: true,
      options: [
        {
          type: 'string',
          name: 'mode',
          description: 'The mode to set the loop to.',
          required: true,
          choices: ['none', 'all', 'single'],
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = musicPlayerCollection.getOrCreate(interaction.guildId!);
    player.setLoopMode(interaction);
  }
}
