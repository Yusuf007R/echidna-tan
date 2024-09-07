import config from '@Configs';
import { Message, User } from 'discord.js';

import OpenAI from 'openai';

type messageHistoryType = {
  author: 'user' | 'assistant';
  content: string;
};

export default class ChatBot {
  private openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openRouterApiKey
  });

  private messageHistory: messageHistoryType[] = [];
  constructor(
    private channelId: string,
    private model: string,
    private user: User
  ) {}

  async processMessage(message: Message) {
    if (message.channelId !== this.channelId) return;
    if (message.author.id !== this.user.id) return;

    message.channel.sendTyping();
    this.messageHistory.push({
      author: 'user',
      content: message.content
    });

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: this.messageHistory.map((msg) => ({
        content: [
          {
            type: 'text',
            text: msg.content
          }
        ],
        role: msg.author
      }))
    });

    const msg = response.choices.at(0)?.message.content;
    if (!msg) throw new Error('Didnt get a message');
    this.messageHistory.push({
      author: 'assistant',
      content: msg
    });

    await message.channel.send(msg);
  }
}
