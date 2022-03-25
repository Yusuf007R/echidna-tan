import { CacheType, CommandInteraction } from 'discord.js';
import { player } from '../..';
import { Command } from '../../structures/command';

export default class Pause implements Command {
  name = 'pause';

  description = 'Pause the music.';

  async run(interaction: CommandInteraction<CacheType>) {
    player.pause(interaction);
  }
}
