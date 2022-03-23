import { CacheType, Collection, CommandInteraction } from 'discord.js';
import { readdirSync } from 'fs';

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  run(interaction: CommandInteraction<CacheType>, args: string[]): Promise<void>;
}

export function CommandLoader(commands: Collection<string, Command>): void {
  readdirSync('./src/commands').flatMap((folder) => readdirSync(`./src/commands/${folder}`)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => {
      const Command = require(`../commands/${folder}/${file}`).default;
      const command = new Command();
      commands.set(command.name, command);
    }));
}
