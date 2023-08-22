import {ClientEvents} from 'discord.js';
import Base from './base';

export type discordEventConfig = {
  eventName: keyof ClientEvents;
  eventType?: eventType;
};

export type eventType = 'once' | 'on';

export abstract class DiscordEvent extends Base {
  eventName: keyof ClientEvents;
  eventType: eventType;

  constructor(configs: discordEventConfig) {
    super();
    this.eventName = configs.eventName;
    this.eventType = configs.eventType || 'on';
  }

  abstract run(...args: any): Promise<void>;
}
