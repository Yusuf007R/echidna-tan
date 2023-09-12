/* eslint-disable @typescript-eslint/no-var-requires */
import {Collection} from 'discord.js';
import {readdirSync} from 'fs';
import {join} from 'path';
import {DiscordEvent, eventType} from '../structures/discord-events';
import EchidnaSingleton from '../structures/echidna-singleton';
export default class EventManager extends EchidnaSingleton {
  events: Collection<string, {type: eventType; event: DiscordEvent}>;

  constructor() {
    super();
    this.events = new Collection<
      string,
      {type: eventType; event: DiscordEvent}
    >();
  }

  init() {
    this.loadEvents();
    this.listenEvent();
  }

  loadEvents() {
    const eventsRootFolder = join(__dirname, '../events');
    readdirSync(eventsRootFolder)
      .filter(file => file.endsWith('.ts'))
      .map(file => {
        const eventFile = join(eventsRootFolder, file);
        const Event = require(eventFile).default;
        const eventObj = new Event();
        this.events.set(eventObj.eventName, {
          event: eventObj,
          type: eventObj.eventType,
        });
      });
    console.log('Events loaded');
  }

  async executeEvent(eventName: string, ...args: any[]) {
    const event = this.events.get(eventName);
    if (!event) {
      throw new Error(`Event ${eventName} not found`);
    }
    try {
      await event.event.run(args);
    } catch (error) {
      console.error(error);
      throw new Error(`Error executing event ${eventName}`);
    }
  }

  listenEvent() {
    this.events.forEach(event => {
      this.echidna[event.type](event.event.eventName, (...args) => {
        event.event.run(...args);
      });
    });
  }
}
