/* eslint-disable @typescript-eslint/no-var-requires */
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders';
import {Collection} from 'discord.js';
import {readdirSync} from 'fs';
import {join} from 'path';
import {options} from '../structures/command';
import {DiscordEvent, eventType} from '../structures/discord-events';
import EchidnaClient from '../structures/echidna-client';

export default class EventManager {
  events: Collection<string, {type: eventType; event: DiscordEvent}>;
  echidna: EchidnaClient;

  constructor(echidnaClient: EchidnaClient) {
    this.echidna = echidnaClient;
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
    // const events: {[key: string]: DiscordEvent[]} = {};
    // const options: {[key: string]: EventOptions} = {};

    readdirSync(eventsRootFolder)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .map(file => {
        // if (file.includes('[options]')) {
        //   const Options = require(file).default;
        //   const optObj = new Options();
        //   // options[eventFolder] = optObj;
        //   return;
        // }
        const eventFile = join(eventsRootFolder, file);
        const Event = require(eventFile).default;
        const eventObj = new Event();
        this.events.set(eventObj.eventName, {
          event: eventObj,
          type: eventObj.eventType,
        });
      });

    // Object.keys(options).forEach(key => {
    //   const option = options[key];
    //   const event = events[key];
    //   event.forEach(cmd => {
    //     cmd.pushValidator(option.validators);
    //   });
    // });
    // Object.keys(events).forEach(key => {
    //   const event = events[key];
    //   event.forEach(e => {
    //     this.events.set(e.eventName, {event: e, type: e.eventType});
    //   });
    // });
    console.log('Events loaded');
  }

  async executeEvent(eventName: string, ...args: any[]) {
    const event = this.events.get(eventName);
    if (!event) {
      throw new Error('Event not found');
      return;
    }
    try {
      event.event.run(args);
    } catch (error) {
      console.error(error);
      throw new Error('Error while executing event');
    }
  }

  async optionBuilder(
    options: options[],
    slash: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  ) {
    options.forEach(element => {
      switch (element.type) {
        case 'string':
          slash.addStringOption(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            if (element.choices?.length) {
              option.addChoices(
                ...element.choices.map(e => ({name: e, value: e})),
              );
            }
            return option;
          });
          break;
        case 'user':
          slash.addUserOption(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            return option;
          });
          break;
        case 'int':
          slash.addIntegerOption(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.required) {
              option.setRequired(true);
            }
            if (element.min) {
              option.setMinValue(element.min);
            }
            if (element.max) {
              option.setMaxValue(element.max);
            }
            return option;
          });
          break;
        case 'sub-command':
          if (!(slash instanceof SlashCommandBuilder)) return;
          slash.addSubcommand(option => {
            option.setName(element.name).setDescription(element.description);
            if (element.options) this.optionBuilder(element.options, option);
            return option;
          });
          break;
        case 'bool':
          slash.addBooleanOption(option => {
            option.setName(element.name).setDescription(element.description);
            return option;
          });
          break;
        default:
          break;
      }
    });
  }

  listenEvent() {
    this.events.forEach(event => {
      this.echidna[event.type](event.event.eventName, (...args) => {
        event.event.run(...args);
      });
    });
  }
}
