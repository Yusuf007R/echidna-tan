import { CacheType, CommandInteraction } from 'discord.js';

import { Command } from '../../structures/command';

export default class NowPlaying extends Command {
  constructor() {
    super({
      name: 'now-playing',
      description: 'Get current song information.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.echidna.musicPlayer.nowPlaying(
      interaction.guildId!,
      interaction,
    );
  }
}
