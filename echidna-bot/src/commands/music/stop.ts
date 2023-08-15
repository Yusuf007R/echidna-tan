import {CacheType, CommandInteraction} from 'discord.js';

import {Command} from '../../structures/command';

export default class Stop extends Command {
  constructor() {
    super({
      name: 'stop',
      description: 'Stop the current song.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const player = this.echidna.musicPlayer.get(interaction.guildId!);
    player.destroy();
    interaction.reply({content: 'Stopped the current song.'});
  }
}
