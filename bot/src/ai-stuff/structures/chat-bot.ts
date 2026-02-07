import config from "@Configs";
import db from "@Drizzle/db";
import { messagesTable } from "@Drizzle/schema";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Managers/chat-bot-manager";
import { MessageSplitter, type SplitMessage } from "@Utils/message-splitter";
import withInterval from "@Utils/with-interval";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type ModelMessage } from "ai";
import dayjs from "dayjs";
import type { DMChannel, Message, ThreadChannel } from "discord.js";
import { MessageType } from "discord.js";
import type { InferSelectModel } from "drizzle-orm";
import type { userTable, chatsTable } from "@Drizzle/schema";

type MessageRole = "user" | "assistant" | "system";

type ChatBotOptions = {
	channel: DMChannel | ThreadChannel;
	model: OpenRouterModel;
	user: InferSelectModel<typeof userTable>;
	prompt: AiPrompt;
	chat: InferSelectModel<typeof chatsTable>;
	messageHistory?: ModelMessage[];
};

export default class ChatBot {
	private clearTypingInterval: (() => void) | null = null;
	private messageHistory: ModelMessage[] = [];
	private openrouter = createOpenRouter({
		apiKey: config.OPENROUTER_API_KEY,
	});

	private constructor(
		private channel: DMChannel | ThreadChannel,
		private model: OpenRouterModel,
		private user: InferSelectModel<typeof userTable>,
		private prompt: AiPrompt,
		private chat: InferSelectModel<typeof chatsTable>,
		messageHistory: ModelMessage[] = [],
	) {
		this.messageHistory = messageHistory;
	}

	static init(options: ChatBotOptions) {
		return new ChatBot(
			options.channel,
			options.model,
			options.user,
			options.prompt,
			options.chat,
			options.messageHistory ?? [],
		);
	}

	async processMessage(message: Message) {
		if (message.channelId !== this.channel.id) return;
		if (message.author.id !== this.user.id) return;
		if (message.system) return;
		if (![MessageType.Default, MessageType.Reply].includes(message.type))
			return;

		this.channel.sendTyping();
		this.clearTypingInterval = withInterval(() => {
			this.channel.sendTyping();
		}, 5000);

		try {
			await this.pushMessage(message.content, "user");
			await this.generateMessage();
		} catch (error) {
			console.error("ChatBot error:", error);
			await this.channel.send("Sorry, something went wrong.");
		} finally {
			if (this.clearTypingInterval) {
				this.clearTypingInterval();
				this.clearTypingInterval = null;
			}
		}
	}

	private async generateMessage() {
		const { system, messages } = this.buildMessageHistory();
		const response = await generateText({
			model: this.openrouter.chat(this.model.id),
			system,
			messages,
		});

		const content = response.text?.trim();
		if (!content) return;

		await this.sendSplitMessage(content);
		await this.pushMessage(content, "assistant", response.usage?.totalTokens);
	}

	private buildMessageHistory(): {
		system: string;
		messages: ModelMessage[];
	} {
		const systemParts: string[] = [];

		for (const configKey of this.prompt.prompt_config) {
			switch (configKey) {
				case "system_message":
					systemParts.push(this.prompt.system_message);
					break;
				case "description":
					if (this.prompt.description) {
						systemParts.push(this.prompt.description);
					}
					break;
				case "userName":
					systemParts.push(`User name: ${this.user.displayName}`);
					break;
				case "currentDate":
					systemParts.push(
						`Current date: ${dayjs().format("dddd, YYYY MMMM DD")}`,
					);
					break;
				default:
					break;
			}
		}

		const history = this.messageHistory.slice(-20);
		return {
			system: systemParts.filter(Boolean).join("\n\n"),
			messages: history,
		};
	}

	private async sendSplitMessage(message: string) {
		const splitter = new MessageSplitter({ maxLength: 1900 });
		const { messages } = splitter.splitMessage(message);
		for (const msg of messages) {
			await this.sendMessage(msg);
		}
	}

	private async sendMessage(splitMessage: SplitMessage) {
		if (splitMessage.type === "text") {
			await this.channel.send(splitMessage.content);
			return;
		}
		await this.channel.send(splitMessage.content);
	}

	private async pushMessage(
		content: string,
		role: MessageRole,
		tokenUsage?: number,
	) {
		if (this.messageHistory.length >= 25) {
			this.messageHistory.shift();
		}

		await db.insert(messagesTable).values({
			role,
			content,
			chatId: this.chat.id,
			tokenUsage: tokenUsage ?? 0,
		});

		this.messageHistory.push({ role, content });
	}
}
