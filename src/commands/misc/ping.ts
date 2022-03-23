import { CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../utils/command';

export default class Ping implements Command {
  name = 'ping';

  aliases = ['pong'];

  description = 'Ping the bot';

  async run(interaction: CommandInteraction<CacheType>, args: string[]): Promise<void> {
    interaction.reply('Pong!');
  }
}
