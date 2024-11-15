/* eslint-disable @typescript-eslint/no-var-requires */
import { DiscordEvent, eventType } from '@Structures/discord-events';
import EchidnaSingleton from '@Structures/echidna-singleton';
import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
export default class EventManager extends EchidnaSingleton {
  events: Collection<string, { type: eventType; event: DiscordEvent }>;

  constructor() {
    super();
    this.events = new Collection<string, { type: eventType; event: DiscordEvent }>();
  }

  init() {
    this.loadEvents();
    this.listenEvent();
  }

  loadEvents() {
    const eventsRootFolder = join(__dirname, '../events');

    readdirSync(eventsRootFolder)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))
      .map((file) => {
        const eventFile = join(eventsRootFolder, file);
        const Event = require(eventFile).default;
        const eventObj = new Event();
        this.events.set(eventObj.eventName, {
          event: eventObj,
          type: eventObj.eventType
        });
      });
    console.log('Events loaded');
  }

  listenEvent() {
    this.events.forEach((event) => {
      this.echidna[event.type](event.event.eventName, async (...args) => {
        try {
          await event.event.run(...args);
        } catch (error) {
          console.error('Error executing event', error);
        }
      });
    });
  }
}
