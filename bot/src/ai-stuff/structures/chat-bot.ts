import config from "@Configs";
import db from "@Drizzle/db";
import {
	type attachmentsTable,
	type chatsTable,
	messagesTable,
	type userTable,
} from "@Drizzle/schema";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Managers/chat-bot-manager";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import withInterval from "@Utils/with-interval";
import { generateText, type ModelMessage } from "ai";
import dayjs from "dayjs";
import {
	type DMChannel,
	type Message,
	MessageType,
	type ThreadChannel,
} from "discord.js";
import type { InferSelectModel } from "drizzle-orm";

type UserTableType = InferSelectModel<typeof userTable>;
type ChatTableType = InferSelectModel<typeof chatsTable>;
type MessageTableType = InferSelectModel<typeof messagesTable>;
type AttachmentTableType = InferSelectModel<typeof attachmentsTable>;

export type ChatBotOptions = {
	user: UserTableType;
	prompt: AiPrompt;
	channel: DMChannel | ThreadChannel;
	model: OpenRouterModel;
	chat: ChatTableType;
	messageHistory: ModelMessage[];
};

const openrouter = createOpenRouter({
	apiKey: config.OPENROUTER_API_KEY,
});
export default class ChatBot {
	private constructor(
		private prompt: AiPrompt,
		private user: UserTableType,
		private channel: DMChannel | ThreadChannel,
		private model: OpenRouterModel,
		private chat: ChatTableType,
		private messageHistory: ModelMessage[] = [],
	) {}

	public static init(options: ChatBotOptions) {
		console.log("Initializing chat bot", options);
		return new ChatBot(
			options.prompt,
			options.user,
			options.channel,
			options.model,
			options.chat,
			options.messageHistory,
		);
	}

	public async processMessage(message: Message) {
		if (
			message.channelId !== this.channel.id ||
			message.author.id !== this.user.id ||
			message.system ||
			message.type !== MessageType.Default
		)
			return;

		const unsub = withInterval(() => this.channel.sendTyping(), 5000);
		this.messageHistory.push({
			role: "user",
			content: message.content,
		});
		const result = await this.generateMessage();
		await this.sendSplitMessage(result.text);
		unsub();
		await this.pushMessage(result.text, "assistant");
	}

	async generateMessage() {
		const messages = this.buildMessageHistory();
		const result = await generateText({
			model: openrouter.chat(this.model.id, {
				provider: {
					only: this.model.allowedProviders,
				},
			}),
			messages,
		});

		return result;
	}

	private buildMessageHistory() {
		const msgs: ModelMessage[] = [];
		for (const configKey of this.prompt.prompt_config) {
			const key = configKey;
			const _value = (this.prompt as any)[key];
			const value =
				typeof _value === "string" ? this.replaceTemplateVars(_value) : _value;

			switch (key) {
				case "system_message":
				case "description":
					msgs.push({
						role: "system",
						content: value,
					});
					break;
				case "userName":
					msgs.push({
						role: "user",
						content: `User name is: ${this.user.displayName}`,
					});
					break;
				case "currentDate":
					msgs.push({
						role: "system",
						content: `Current date: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`,
					});
					break;
				default:
					break;
			}
		}
		// const modelHasImageAnalysis =
		// 	this.model.architecture.modality.includes("image");
		// const lastUserMessage = this.lastMessage("user")!;
		// if (!modelHasImageAnalysis && lastUserMessage.attachments.length) {
		// 	console.log(
		// 		"Processing image analysis because model cannot handle images",
		// 	);
		// 	const imageAnalysis = await this.processImageAnalysis(
		// 		lastUserMessage.attachments.map((a) => a.base64),
		// 	);
		// 	if (imageAnalysis) {
		// 		msgs.push({
		// 			role: "system",
		// 			content: imageAnalysis,
		// 		});
		// 	}
		// }

		const msgHistory = this.messageHistory.map<ModelMessage>((msg) => {
			return msg;
		});
		msgs.push(...msgHistory);
		return msgs;
	}

	private async pushMessage(
		content: string,
		role: InferSelectModel<typeof messagesTable>["role"],
	) {
		if (this.messageHistory.length >= 25) {
			this.messageHistory.shift();
		}

		const [message] = await db
			.insert(messagesTable)
			.values({
				role,
				content,
				chatId: this.chat.id,
				tokenUsage: 0,
				cost: 0,
			})
			.returning();

		if (!message) return;

		this.messageHistory.push({
			role,
			content,
		});

		return message;
	}

	private async sendSplitMessage(text: string) {
		const maxLength = 1900;
		if (text.length <= maxLength) {
			await this.channel.send(text);
			return;
		}

		const chunks = this.splitMessage(text, maxLength);
		for (const chunk of chunks) {
			await this.channel.send(chunk);
		}
	}

	private splitMessage(text: string, maxLength: number): string[] {
		const chunks: string[] = [];

		for (let i = 0; i < text.length; i += maxLength) {
			chunks.push(text.substring(i, i + maxLength));
		}

		return chunks;
	}

	private replaceTemplateVars(string: string) {
		return string.replace(/{{([^{}]*)}}/g, (match, p1: string) => {
			switch (p1) {
				case "name":
					return this.prompt.name;
				case "user":
					return this.user.displayName;
				default:
					return match;
			}
		});
	}
}
