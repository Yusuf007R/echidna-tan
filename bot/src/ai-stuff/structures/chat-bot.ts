/* eslint-disable @typescript-eslint/no-var-requires */
import config from '@Configs';
import { AiPrompt } from '@Interfaces/ai-prompts';
import { OpenRouterModel } from '@Interfaces/open-router-model';
import CacheManager from '@Structures/cache-manager';
import { MessageSplitter, SplitMessage } from '@Utils/message-splitter';
import randomNumber from '@Utils/random-number';
import { AttachmentBuilder, Message, MessageType, TextChannel, ThreadChannel, User } from 'discord.js';
import { readdirSync } from 'fs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, CompletionUsage } from 'openai/resources/index.mjs';
import { join } from 'path';

type messageHistoryType = {
  author: 'user' | 'assistant' | 'system';
  content: string;
};

export default class ChatBot {
  private static openai = new OpenAI({
    baseURL: config.OPENROUTER_URL,
    apiKey: config.OPENROUTER_API_KEY
  });

  private cost = 0;

  private messageHistory: messageHistoryType[] = [];
  private static promptsTemplates: { name: string; promptTemplate: AiPrompt }[] = [];
  constructor(
    private channel: TextChannel | ThreadChannel,
    private model: OpenRouterModel,
    private user: User,
    private prompt: AiPrompt
  ) {
    this.init();
  }

  static getPromptsTemplates() {
    if (ChatBot.promptsTemplates.length) return ChatBot.promptsTemplates;
    const templatesPath = join(__dirname, '../templates');
    readdirSync(templatesPath).forEach((file) => {
      const prompt = require(`${templatesPath}/${file}`).default;
      ChatBot.promptsTemplates.push({ name: file.split('.')[0], promptTemplate: prompt });
    });
    return ChatBot.promptsTemplates;
  }

  init() {
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

  static async getModelList(): Promise<OpenRouterModel[]> {
    const cacheKey = 'open-router-model-list';

    const cached = CacheManager.get(cacheKey);
    if (cached) return cached as any;

    const list = (await this.openai.models.list()).data;
    CacheManager.set(cacheKey, list, {
      ttl: CacheManager.TTL.oneDay
    });
    return list as any;
  }

  static async getModel(id: string) {
    return (await this.getModelList()).find((model) => model.id === id);
  }

  async processMessage(message: Message) {
    if (message.channelId !== this.channel.id) return;
    if (message.author.id !== this.user.id) return;
    if (message.system) return;
    if (![MessageType.Default, MessageType.Reply].includes(message.type)) return;

    this.messageHistory.push({
      author: 'user',
      content: message.content
    });

    this.generateMessage();
  }

  async generateMessage() {
    this.channel.sendTyping();

    const response = await ChatBot.openai.chat.completions.create({
      model: this.model.id,
      messages: this.buildMessageHistory(),
      stream: true
    });

    const splitter = new MessageSplitter();

    for await (const chunk of response) {
      this.addToCost(chunk.usage);
      const choice = chunk.choices?.[0];
      const isLastChunk = choice?.finish_reason !== null;
      const chunkMessage = choice?.delta.content;
      if (typeof chunkMessage !== 'string') continue;
      const splitMessage = splitter.addStreamMessage(chunkMessage, isLastChunk);
      if (!splitMessage) continue;
      this.sendMessage(splitMessage, splitter.maxLength);
    }

    // await this.channel.send(`Tokens: ${response.usage?.completion_tokens} - total cost: ${this.cost.toFixed(5)}`);
    await this.sendAsAttachment(splitter.getFullStreamMessage(), 'original-response');

    console.log('wholeMessage Len', splitter.getFullStreamMessage().length);
    const totalLength = splitter.getMessages().reduce((acc, cur) => acc + cur.content.length, 0);
    console.log('totalLength', totalLength);
  }

  private async sendMessage(splitMessage: SplitMessage, maxLength: number) {
    if (splitMessage.type === 'text') {
      await this.channel.send(`${splitMessage.content} - Length: ${splitMessage.content.length}`);
    } else {
      if (splitMessage.content.length > maxLength) {
        await this.sendAsAttachment(splitMessage.content, `${splitMessage.language ?? 'code'}-${0}`);
        return;
      }
      await this.channel.send(`${splitMessage.content} - Length: ${splitMessage.content.length}`);
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
            content: `Interaction Context:
            ${value}
            `
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

  async addToCost(usage?: CompletionUsage) {
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
