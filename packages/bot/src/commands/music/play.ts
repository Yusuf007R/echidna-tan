import {CacheType, CommandInteraction} from 'discord.js';
import {MusicCommand} from './[options]';

export default class Play extends MusicCommand {
  constructor() {
    super({
      name: 'play',
      description: 'Play or search a song',
      voiceChannelOnly: true,
      shouldDefer: true,
      options: [
        {
          type: 'string',
          name: 'query',
          description: 'query to search or url to play',
          required: true,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await this.echidna.musicPlayer.play(
      interaction,
      this.choices.getString('query', true),
    );
  }
}
