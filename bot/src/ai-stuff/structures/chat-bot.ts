import config from "@Configs";
import type { chatsTable, userTable } from "@Drizzle/schema";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Managers/chat-bot-manager";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import withInterval from "@Utils/with-interval";
import { generateText, type ModelMessage } from "ai";
import dayjs from "dayjs";
import {
	MessageType,
	type DMChannel,
	type Message,
	type ThreadChannel,
} from "discord.js";
import type { InferSelectModel } from "drizzle-orm";
import type { ChatBotUsage } from "./chat-botold";

type User = InferSelectModel<typeof userTable>;

export type ChatBotOptions = {
	user: User;
	prompt: AiPrompt;
	channel: DMChannel | ThreadChannel;
	model: OpenRouterModel;
	chat: InferSelectModel<typeof chatsTable>;
	messageHistory: ModelMessage[];
};

const openrouter = createOpenRouter({
	apiKey: config.OPENROUTER_API_KEY,
});
export default class ChatBot {
	private constructor(
		private prompt: AiPrompt,
		private user: User,
		private channel: DMChannel | ThreadChannel,
		private model: OpenRouterModel,
		private chat: InferSelectModel<typeof chatsTable>,
		private messageHistory: ModelMessage[] = [],
	) {}

	public static init(options: ChatBotOptions) {
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

		withInterval(() => this.channel.sendTyping(), 5000);
		this.messageHistory.push({
			role: "user",
			content: message.content,
		});
		const result = await this.generateMessage();
		await this.sendSplitMessage(result.text);
		this.messageHistory.push({
			role: "assistant",
			content: result.text,
		});
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
				case "last_system_message":
				case "description":
					msgs.push({
						role: "system",
						content: value,
					});
					break;
				case "user_name":
					msgs.push({
						role: "user",
						content: `User name is: ${this.user.displayName}`,
					});
					break;
				case "current_date":
					msgs.push({
						role: "system",
						content: `Current date: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`,
					});
					break;
				case "chat_examples":
					{
						const exampleMsgs =
							this.prompt.chat_examples?.flatMap<ModelMessage>((msg) => {
								return [
									{
										role: "system",
										content: "[Example Chat]",
									},
									{
										role: "system",
										name: "example_assistant",
										content: msg,
									},
								];
							});
						if (exampleMsgs?.length) msgs.push(...exampleMsgs);
					}
					break;
				case "interaction_context":
					msgs.push({
						role: "system",
						content: `Interaction Context:\n${value}`,
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
		attachments?: ModelMessage["attachments"],
		usage?: ChatBotUsage,
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
				tokenUsage: usage?.total_tokens,
				cost: usage?.cost,
			})
			.returning();

		if (!message) return;

		if (attachments?.length) {
			await db.transaction(async (tx) => {
				await Promise.all(
					attachments.map((attachment) =>
						tx.insert(attachmentsTable).values({
							base64: attachment.base64,
							messageId: message.id,
							type: attachment.type,
							url: attachment.url,
						}),
					),
				);
			});
		}
		this.messageHistory.push({
			author: role,
			content,
			attachments: attachments ?? [],
		});

		return message;
	}

	private async sendSplitMessage(text: string) {
		const maxLength = 3900;
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
