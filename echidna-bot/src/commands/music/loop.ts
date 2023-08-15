import {CacheType, CommandInteraction} from 'discord.js';

import {Command} from '../../structures/command';

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
    const player = this.echidna.musicPlayer.get(interaction.guildId!);
    const mode = this.choices.getString('mode', true);
    player.setLoop(mode.toUpperCase() as any);
    interaction.reply({content: `Loop mode set to \`${mode}\``});
  }
}
