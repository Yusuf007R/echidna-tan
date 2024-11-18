/* eslint-disable @typescript-eslint/no-var-requires */
import { AiPrompt } from '@Interfaces/ai-prompts';
import { OpenRouterModel } from '@Interfaces/open-router-model';
import { MessageSplitter, SplitMessage } from '@Utils/message-splitter';
import randomNumber from '@Utils/random-number';
import { openRouterAPI } from '@Utils/request';
import { AttachmentBuilder, Message, MessageType, TextChannel, ThreadChannel } from 'discord.js';
import { InferSelectModel } from 'drizzle-orm';

import { ChatCompletionMessageParam, CompletionUsage } from 'openai/resources';
import { usersTable } from 'src/drizzle/schema';
import MemoriesManager from './memories';

type messageHistoryType = {
  author: 'user' | 'assistant' | 'system';
  content: string;
};

export default class ChatBot {
  private cost = 0;
  private hasMemories = false;
  private messageHistory: messageHistoryType[] = [];
  private memoriesManager!: MemoriesManager;

  constructor(
    private channel: TextChannel | ThreadChannel,
    private model: OpenRouterModel,
    private user: InferSelectModel<typeof usersTable>,
    private prompt: AiPrompt
  ) {
    this.memoriesManager = new MemoriesManager(this.user);
    this.init();
  }

  lastMessage(filter?: messageHistoryType['author']) {
    if (!filter) return this.messageHistory[this.messageHistory.length - 1];
    return this.messageHistory.find((msg) => msg.author === filter);
  }

  init() {
    this.hasMemories = this.prompt.prompt_config.includes('memory');
    if (this.hasMemories) this.memoriesManager.loadMemories();
    if (this.prompt.type === 'roleplay' && this.prompt.initial_message) {
      const index = randomNumber(0, this.prompt.initial_message.length - 1);
      const content = this.prompt.initial_message[index];
      this.messageHistory.push({
        author: 'assistant',
        content
      });
      this.channel.send(content);
    }
  }

  async processMessage(message: Message) {
    if (message.channelId !== this.channel.id) return;
    if (message.author.id !== this.user.discordId) return;
    if (message.system) return;
    if (![MessageType.Default, MessageType.Reply].includes(message.type)) return;

    this.messageHistory.push({
      author: 'user',
      content: message.content
    });

    this.generateMessage();
    if (this.hasMemories) this.memoriesManager.memorySaver(message.content);
  }

  async generateMessage() {
    this.channel.sendTyping();

    const response = await openRouterAPI.chat.completions.create({
      model: this.model.id,
      messages: this.buildMessageHistory(),
      stream: true
    });

    const splitter = new MessageSplitter({ isStream: true });
    splitter.queue.on('message', async (msg) => {
      await this.sendMessage(msg, splitter.maxLength);
    });

    for await (const chunk of response) {
      this.addToCost(chunk.usage);
      const choice = chunk.choices?.[0];
      const isLastChunk = choice?.finish_reason !== null;
      const chunkMessage = choice?.delta.content;
      if (typeof chunkMessage !== 'string') continue;
      splitter.addStreamMessage(chunkMessage, isLastChunk);
    }

    // await this.channel.send(`Tokens: ${response.usage?.completion_tokens} - total cost: ${this.cost.toFixed(5)}`);
    // await this.sendAsAttachment(splitter.getFullStreamMessage(), 'original-response');
    const totalLength = splitter.getMessages().reduce((acc, cur) => acc + cur.content.length, 0);
    console.log(
      `Total split message length: ${totalLength}, full message length: ${splitter.getFullStreamMessage().length}`
    );
  }

  private async sendMessage(splitMessage: SplitMessage, maxLength: number) {
    if (splitMessage.type === 'text') {
      await this.channel.send(`${splitMessage.content}`);
    } else {
      if (splitMessage.content.length > maxLength) {
        await this.sendAsAttachment(splitMessage.content, `${splitMessage.language ?? 'code'}-${0}`);
        return;
      }
      await this.channel.send(`${splitMessage.content}`);
    }
  }

  private async sendAsAttachment(msg: string, name: string) {
    const attachment = new AttachmentBuilder(Buffer.from(msg), {
      name: `${name}-${msg.length}.txt`
    });
    await this.channel.send({
      files: [attachment]
    });
  }

  buildMessageHistory() {
    const msgs: ChatCompletionMessageParam[] = [];

    this.prompt.prompt_config.forEach((configKey) => {
      const key = configKey;
      const _value = (this.prompt as any)[key];
      const value = typeof _value === 'string' ? this.replaceTemplateVars(_value) : _value;

      switch (key) {
        case 'system_message':
        case 'last_system_message':
        case 'description':
          msgs.push({
            role: 'system',
            content: value
          });
          break;
        case 'user_name':
          msgs.push({
            role: 'user',
            content: `User name is: ${this.user.displayName}`
          });
          break;
        case 'memory':
          msgs.push({
            role: 'system',
            content: `Current memories:\n${this.memoriesManager
              .getMemories()
              .map((mem) => mem.memory)
              .join('\n')}`
          });
          break;
        case 'current_date':
          msgs.push({
            role: 'system',
            content: `Current date: ${new Date().toISOString().split('T')[0]}`
          });
          break;
        case 'chat_examples':
          {
            const exampleMsgs = this.prompt.chat_examples?.flatMap<ChatCompletionMessageParam>((msg) => {
              return [
                {
                  role: 'system',
                  content: '[Example Chat]'
                },
                {
                  role: 'system',
                  name: 'example_assistant',
                  content: msg
                }
              ];
            });
            if (exampleMsgs?.length) msgs.push(...exampleMsgs);
          }
          break;
        case 'interaction_context':
          msgs.push({
            role: 'system',
            content: `Interaction Context:\n${value}`
          });
          break;
        default:
          break;
      }
    });
    const msgHistory = this.messageHistory.map<ChatCompletionMessageParam>((msg) => ({
      content: msg.content,
      role: msg.author
    }));
    msgs.push(...msgHistory);
    return msgs;
  }

  async addToCost(usage?: CompletionUsage | null) {
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;

    const promptPrice = parseFloat(this.model?.pricing?.prompt as string);
    const completionPrice = parseFloat(this.model?.pricing?.completion as string);

    if (isNaN(promptPrice) || isNaN(completionPrice)) {
      console.warn('One or both pricing values are invalid, skipping cost computation.');
      return;
    }

    const inputCost = inputTokens * promptPrice;
    const outputCost = outputTokens * completionPrice;

    this.cost += inputCost + outputCost;
  }

  replaceTemplateVars(string: string) {
    return string.replace(/{{([^{}]*)}}/g, (match, p1: string) => {
      switch (p1) {
        case 'name':
          return this.prompt.name;
        case 'user':
          return this.user.displayName;
        default:
          return match;
      }
    });
  }
}
