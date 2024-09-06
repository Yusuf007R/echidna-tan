import { ClientEvents } from 'discord.js';
import EchidnaSingleton from './echidna-singleton';

export type discordEventConfig<Event extends keyof ClientEvents> = {
  eventName: Event;
  eventType?: eventType;
};

export type eventType = 'once' | 'on';

export abstract class DiscordEvent<Event extends keyof ClientEvents> extends EchidnaSingleton {
  eventName: Event;
  eventType: eventType;

  constructor(configs: discordEventConfig<Event>) {
    super();
    this.eventName = configs.eventName;
    this.eventType = configs.eventType || 'on';
  }

  abstract run(...args: ClientEvents[Event]): Promise<void>;
}
