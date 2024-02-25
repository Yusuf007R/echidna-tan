import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Seek extends MusicCommand {
  constructor() {
    super({
      name: 'seek',
      description: 'Seek to a specific time in the current song.',
      voiceChannelOnly: true,
      options: [
        {
          type: 'int',
          description: 'The time to seek to.',
          name: 'time',
          required: true,
          min: 0,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const seekTime = this.choices.getNumber('time', true);
    this.player?.seekTo(seekTime);
    await interaction.reply({content: `Seeked to \`${seekTime}\``});
  }
}
