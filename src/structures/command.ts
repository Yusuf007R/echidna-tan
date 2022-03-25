import { CacheType, CommandInteraction } from 'discord.js';

export type options = {type: 'string'; name: string; description: string; required?: boolean};

export interface Command {
  name: string;
  description: string;
  options?: options[];
  run(interaction: CommandInteraction<CacheType>, args?: string[]): Promise<void>;
}
