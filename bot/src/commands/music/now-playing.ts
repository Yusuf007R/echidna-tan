import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[wrapper]';

export default class NowPlaying extends MusicCommand {
  constructor() {
    super({
      name: 'now-playing',
      description: 'Get current song information.'
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    if (!this.player) {
      interaction.editReply('Nothing currently playing');
      return;
    }
    await this.echidna.musicPlayer.nowPlaying(this.player);
  }
}
