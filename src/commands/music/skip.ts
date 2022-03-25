import { CacheType, CommandInteraction } from 'discord.js';
import { player } from '../..';
import { Command } from '../../structures/command';

export default class Skip implements Command {
  name = 'skip';

  description = 'Pase the music.';

  async run(interaction: CommandInteraction<CacheType>) {
    player.skip(interaction);
  }
}
