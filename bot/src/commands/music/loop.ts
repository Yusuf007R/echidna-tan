import capitalize from '@Utils/capitalize';
import { QueueRepeatMode } from 'discord-player';
import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[wrapper]';

export default class LoopCommand extends MusicCommand {
  constructor() {
    super({
      name: 'loop',
      description: 'Set the loop mode of the player.',

      options: [
        {
          type: 'string',
          name: 'mode',
          description: 'The mode to set the loop to.',
          required: true,
          choices: Object.keys(QueueRepeatMode).map((opt) => capitalize(opt))
        }
      ]
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const modeOpt = this.choices.getString('mode', true);
    // ts is being weird 💀
    const mode = QueueRepeatMode[modeOpt.toUpperCase() as keyof typeof QueueRepeatMode];
    this.player?.setRepeatMode(mode);
    await interaction.reply({ content: `Loop mode set to \`${mode}\`` });
  }
}
