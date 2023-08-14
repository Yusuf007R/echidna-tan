import { CacheType, CommandInteraction } from 'discord.js';

import { Command } from '../../structures/command';

export default class Pause extends Command {
  constructor() {
    super({
      name: 'pause',
      description: 'Pause the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = this.echidna.musicPlayer.get(interaction.guildId!);
    player.pause();
    interaction.reply({content: 'Paused the current song.'});
  }
}
