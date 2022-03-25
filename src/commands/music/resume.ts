import { CacheType, CommandInteraction } from 'discord.js';
import { player } from '../..';
import { Command } from '../../structures/command';

export default class Resume implements Command {
  name = 'resume';

  description = 'Skip a song in the queue.';

  async run(interaction: CommandInteraction<CacheType>) {
    player.skip(interaction);
  }
}
