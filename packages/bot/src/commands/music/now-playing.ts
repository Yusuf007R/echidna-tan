import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class NowPlaying extends MusicCommand {
  constructor() {
    super({
      name: 'now-playing',
      description: 'Get current song information.',
      voiceChannelOnly: true,
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    this.echidna.musicPlayer.nowPlaying(interaction.guildId!, interaction);
  }
}
