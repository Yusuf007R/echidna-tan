import { CacheType, CommandInteraction } from 'discord.js';

import { Command } from '../../structures/command';

export default class Seek extends Command {
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
    const player = this.echidna.musicPlayer.get(interaction.guildId!);
    const seekTime = this.choices.getNumber('time', true);
    player.seekTo(seekTime);
    interaction.reply({content: `Seeked to \`${seekTime}\``});
  }
}
