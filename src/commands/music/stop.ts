import { CacheType, CommandInteraction } from 'discord.js';
import { player } from '../..';
import { Command } from '../../structures/command';

export default class Stop implements Command {
  name = 'stop';

  description = 'Stop the music';

  async run(interaction: CommandInteraction<CacheType>, args?: string[]) {
    player.stop(interaction);
  }
}
