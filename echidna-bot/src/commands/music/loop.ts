import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';

import { Command } from '../../structures/command';
import GetChoices from '../../utils/get-choices';

export default class LoopCommand extends Command {
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
          choices: ['none', 'track', 'queue'],
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = echidnaClient.musicPlayer.get(interaction.guildId!);
    const mode = new GetChoices(interaction.options).getString('mode', true)!;
    player.setLoop(mode.toUpperCase() as any)
    interaction.reply({ content: `Loop mode set to \`${mode}\`` })

  }
}
