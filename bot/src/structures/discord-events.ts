import {ClientEvents} from 'discord.js';
import EchidnaSingleton from './echidna-singleton';

export type discordEventConfig = {
  eventName: keyof ClientEvents;
  eventType?: eventType;
};

export type eventType = 'once' | 'on';

export abstract class DiscordEvent extends EchidnaSingleton {
  eventName: keyof ClientEvents;
  eventType: eventType;

  constructor(configs: discordEventConfig) {
    super();
    this.eventName = configs.eventName;
    this.eventType = configs.eventType || 'on';
  }

  abstract run(...args: any): Promise<void>;
}
