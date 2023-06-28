import { CacheType, CommandInteraction } from 'discord.js';

import { echidnaClient } from '../..';
import { Command } from '../../structures/command';
import GetChoices from '../../utils/get-choices';

export default class Volume extends Command {
  constructor() {
    super({
      name: 'volume',
      description: 'Set the volume of the music player. (0-100)',
      voiceChannelOnly: true,
      options: [
        {
          type: 'int',
          description: 'The volume to set the music player to.',
          name: 'volume',
          required: true,
          min: 0,
          max: 100,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    const volume = new GetChoices(interaction.options).getNumber('volume', true)!;
    player.setVolume(volume)
    interaction.reply({ content: `Volume set to \`${volume}\`` })
  }
}
