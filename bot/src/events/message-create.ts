import config from '@Configs';
import { DiscordEvent } from '@Structures/discord-events';
import { Message } from 'discord.js';

import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.openRouterApiKey
});

type messageHistoryType = {
  author: 'user' | 'assistant';
  content: string;
};

const messageHistory: messageHistoryType[] = [];

export default class MessageCreate extends DiscordEvent<'messageCreate'> {
  constructor() {
    super({ eventName: 'messageCreate', eventType: 'on' });
  }

  async run(message: Message) {
    if (message.author.id !== config.discordOpUserID) return;
    messageHistory.push({
      author: 'user',
      content: message.content
    });

    const response = await openai.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: messageHistory.map((msg) => ({
        content: [
          {
            type: 'text',
            text: msg.content
          }
        ],
        role: msg.author
      }))
    });
    console.log(response);
    const msg = response.choices.at(0)?.message.content;
    if (!msg) throw new Error('no se que paso');
    messageHistory.push({
      author: 'assistant',
      content: msg
    });
    message.channel.send(msg);
  }
}
