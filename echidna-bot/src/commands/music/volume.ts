import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Volume extends MusicCommand {
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
    const volume = this.choices.getNumber('volume', true);
    this.player?.setVolume(volume);
    interaction.reply({content: `Volume set to \`${volume}\``});
  }
}
