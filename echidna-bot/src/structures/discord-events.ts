import { CacheType, ClientEvents, Interaction } from 'discord.js';
import Base from './base';

export type discordEventConfig = {
  eventName: keyof ClientEvents;
  eventType?: eventType;
};

export type eventType = 'once' | 'on';

export class DiscordEvent extends Base {
  eventName: string;
  eventType: eventType;
  
  constructor(configs: discordEventConfig) {
    super();
    this.eventName = configs.eventName;
    this.eventType = configs.eventType || 'on';
  }

  run(_interaction: Interaction<CacheType>): Promise<void> {
    return Promise.resolve();
  }
}
