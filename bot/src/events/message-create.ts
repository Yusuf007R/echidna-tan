import { DiscordEvent } from '@Structures/discord-events';
import { Message } from 'discord.js';

export default class MessageCreate extends DiscordEvent<'messageCreate'> {
  constructor() {
    super({ eventName: 'messageCreate', eventType: 'on' });
  }

  async run(message: Message) {}
}
