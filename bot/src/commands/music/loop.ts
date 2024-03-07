import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[options]';

export default class LoopCommand extends MusicCommand {
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
          choices: ['none', 'track', 'queue']
        }
      ]
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const mode = this.choices.getString('mode', true);
    this.player?.setLoop(mode.toUpperCase() as any);
    await interaction.reply({ content: `Loop mode set to \`${mode}\`` });
  }
}
