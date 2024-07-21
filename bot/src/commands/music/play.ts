import { CacheType, CommandInteraction } from 'discord.js';
import { MusicCommand } from './[wrapper]';

export default class Play extends MusicCommand {
  constructor() {
    super({
      name: 'play',
      description: 'Play or search a song',
      options: [
        {
          type: 'string',
          name: 'query',
          description: 'query to search or url to play',
          required: true
        }
      ]
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await this.echidna.musicPlayer.playCmd(interaction, this.choices.getString('query', true));
  }
}
