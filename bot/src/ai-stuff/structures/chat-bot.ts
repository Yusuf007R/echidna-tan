import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Interfaces/open-router-model";
import type {
	messageAttachmentType,
	messageHistoryType,
} from "@Managers/chat-bot-manager";
import calcCompletionUsage from "@Utils/calc-completion-usage";
import { extractImageFromMsg } from "@Utils/extract-image-from-msg";
import getImageAsBuffer from "@Utils/get-image-from-url";
import { MessageSplitter, type SplitMessage } from "@Utils/message-splitter";
import randomNumber from "@Utils/random-number";
import { openRouterAPI } from "@Utils/request";
import dayjs from "dayjs";
import {
	AttachmentBuilder,
	type DMChannel,
	type Message,
	MessageType,
	type ThreadChannel,
} from "discord.js";
import { and, count, eq, type InferSelectModel, sum } from "drizzle-orm";
import type {
	ChatCompletionMessageParam,
	CompletionUsage,
} from "openai/resources/index.mjs";
import sharp from "sharp";
import db from "src/drizzle";
import {
	attachmentsTable,
	type chatsTable,
	memoriesTable,
	messagesTable,
	type userTable,
} from "src/drizzle/schema";
import { AiUtils } from "./ai-utils";
import MemoriesManager from "./memories";
export type ChatBotModelConfig = {
	temp?: string;
};

export type ChatBotUsage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	cost: number;
};

type ChatBotOptions = {
	channel: DMChannel | ThreadChannel;
	model: OpenRouterModel;
	user: InferSelectModel<typeof userTable>;
	prompt: AiPrompt;
	chat: InferSelectModel<typeof chatsTable>;
	messageHistory?: messageHistoryType[];
	modelConfig?: ChatBotModelConfig;
};

export default class ChatBot {
	private usage: ChatBotUsage = {
		prompt_tokens: 0,
		completion_tokens: 0,
		total_tokens: 0,
		cost: 0,
	};

	private interval: NodeJS.Timeout | null = null;

	private constructor(
		private channel: DMChannel | ThreadChannel,
		private model: OpenRouterModel,
		private user: InferSelectModel<typeof userTable>,
		private prompt: AiPrompt,
		private chat: InferSelectModel<typeof chatsTable>,
		private hasMemories: boolean,
		private memoriesManager: MemoriesManager,
		private modelConfig: ChatBotModelConfig | undefined,
		private messageHistory: messageHistoryType[] = [],
	) {}

	lastMessage(filter?: messageHistoryType["author"]) {
		return this.messageHistory
			.filter((msg) => {
				if (!filter) return true;
				return msg.author === filter;
			})
			.at(-1);
	}

	static init(options: ChatBotOptions) {
		const messageHistory: messageHistoryType[] = [];
		const hasMemories = options.prompt.prompt_config.includes("memory");
		const memoriesManager = new MemoriesManager(
			options.chat,
			options.user,
			options.prompt,
		);

		if (
			options.prompt.type === "roleplay" &&
			options.prompt.initial_message &&
			(!options.messageHistory || options.messageHistory.length === 0)
		) {
			const index = randomNumber(0, options.prompt.initial_message.length - 1);
			const content = options.prompt.initial_message[index];
			messageHistory.push({
				author: "assistant",
				content,
				attachments: [],
			});
			options.channel.send(content);
		}

		if (options.messageHistory) {
			messageHistory.push(...options.messageHistory);
		}

		return new ChatBot(
			options.channel,
			options.model,
			options.user,
			options.prompt,
			options.chat,
			hasMemories,
			memoriesManager,
			options.modelConfig,
			messageHistory,
		);
	}

	async processMessage(message: Message) {
		this.channel.sendTyping();

		this.interval = setInterval(() => {
			this.channel.sendTyping();
		}, 5000);

		if (message.channelId !== this.channel.id) return;
		if (message.author.id !== this.user.id) return;
		if (message.system) return;
		if (![MessageType.Default, MessageType.Reply].includes(message.type))
			return;

		const imagesUrls = extractImageFromMsg(message);
		const images = await this.processImages(imagesUrls);
		const userMessage = await this.pushMessage(message.content, "user", images);
		if (!userMessage) return;
		void (this.hasMemories
			? this.memoriesManager.manageMemory()
			: Promise.resolve());
		console.log("Generating message with model: ", this.model.id);
		await this.generateMessage();
	}

	private async generateMessage() {
		const time = Date.now();
		const messages = await this.buildMessageHistory();

		const response = await openRouterAPI.chat.completions.create({
			model: this.model.id,
			messages,
			stream: true,
		});

		const splitter = new MessageSplitter({ isStream: true });
		splitter.queue.on("message", async (msg) => {
			await this.sendMessage(msg, splitter.maxLength);
		});

		for await (const chunk of response) {
			this.calculateCost(chunk.usage);
			const choice = chunk.choices?.[0];
			const isLastChunk = choice?.finish_reason !== null;
			const chunkMessage = choice?.delta.content;
			if (typeof chunkMessage !== "string") continue;
			splitter.addStreamMessage(chunkMessage, isLastChunk);
		}

		if (this.interval) clearInterval(this.interval);

		const totalLength = splitter
			.getMessages()
			.reduce((acc, cur) => acc + cur.content.length, 0);
		const message = splitter.getFullStreamMessage();

		await this.pushMessage(message, "assistant", undefined, this.usage);

		console.log(
			`Total split message length: ${totalLength}, full message length: ${
				message.length
			}, cost: ${this.usage.cost.toFixed(5)}, time: ${Date.now() - time}ms`,
		);
		this.resetUsage();
	}

	private async sendMessage(splitMessage: SplitMessage, maxLength: number) {
		if (splitMessage.type === "text") {
			await this.channel.send(`${splitMessage.content}`);
		} else {
			if (splitMessage.content.length > maxLength) {
				await this.sendAsAttachment(
					splitMessage.content,
					`${splitMessage.language ?? "code"}-${0}`,
				);
				return;
			}
			await this.channel.send(`${splitMessage.content}`);
		}
	}

	private async sendAsAttachment(msg: string, name: string) {
		const attachment = new AttachmentBuilder(Buffer.from(msg), {
			name: `${name}-${msg.length}.txt`,
		});
		return await this.channel.send({
			files: [attachment],
		});
	}

	private async buildMessageHistory() {
		const msgs: ChatCompletionMessageParam[] = [];

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
				case "memory": {
					const memories = await this.memoriesManager.retrieveMemories(
						this.messageHistory.at(-1)?.content ?? "",
					);
					if (memories.length) {
						msgs.push({
							role: "system",
							content: `Current memories:\n${memories
								.map(
									(mem) =>
										`${mem.memory} Date: ${dayjs(mem.date).format("YYYY-MM-DD HH:mm:ss")}`,
								)
								.join("\n")}`,
						});
					}
					break;
				}
				case "current_date":
					msgs.push({
						role: "system",
						content: `Current date: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`,
					});
					break;
				case "chat_examples":
					{
						const exampleMsgs =
							this.prompt.chat_examples?.flatMap<ChatCompletionMessageParam>(
								(msg) => {
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
								},
							);
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
		const modelHasImageAnalysis =
			this.model.architecture.modality.includes("image");
		const lastUserMessage = this.lastMessage("user")!;
		if (!modelHasImageAnalysis && lastUserMessage.attachments.length) {
			console.log(
				"Processing image analysis because model cannot handle images",
			);
			const imageAnalysis = await this.processImageAnalysis(
				lastUserMessage.attachments.map((a) => a.base64),
			);
			if (imageAnalysis) {
				msgs.push({
					role: "system",
					content: imageAnalysis,
				});
			}
		}

		const msgHistory = this.messageHistory.map<ChatCompletionMessageParam>(
			(msg) => {
				if (
					msg.author === "user" &&
					msg.attachments?.length &&
					modelHasImageAnalysis
				) {
					return {
						role: "user",
						content: [
							{
								type: "text",
								text: msg.content,
							},
							...msg.attachments.map(
								(a) =>
									({
										type: "image_url",
										image_url: {
											url: a.base64,
										},
									}) as const,
							),
						],
					};
				}
				return {
					role: msg.author,
					content: msg.content,
				};
			},
		);
		msgs.push(...msgHistory);
		return msgs;
	}

	private resetUsage() {
		this.usage = {
			prompt_tokens: 0,
			completion_tokens: 0,
			total_tokens: 0,
			cost: 0,
		};
	}

	private calculateCost(usage?: CompletionUsage | null) {
		if (!usage) return;
		const { totalCost, promptTokens, completionTokens } = calcCompletionUsage(
			usage,
			this.model,
		);
		this.usage.prompt_tokens += promptTokens;
		this.usage.completion_tokens += completionTokens;
		this.usage.total_tokens += usage.total_tokens;
		this.usage.cost += totalCost;
	}

	async getChatBotInfo() {
		const [[info], [memoriesInfo]] = await Promise.all([
			db
				.select({
					count: count(),
					cost: sum(messagesTable.cost),
					total_tokens: sum(messagesTable.tokenUsage),
				})
				.from(messagesTable)
				.where(eq(messagesTable.chatId, this.chat.id)),
			db
				.select({
					count: count(),
				})
				.from(memoriesTable)
				.where(
					and(
						eq(memoriesTable.userId, this.user.id),
						eq(memoriesTable.promptTemplate, this.prompt.name),
					),
				),
		]);

		return {
			chat: this.chat,
			user: this.user,
			info,
			numMemories: memoriesInfo.count,
		};
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

	private async pushMessage(
		content: string,
		role: InferSelectModel<typeof messagesTable>["role"],
		attachments?: messageHistoryType["attachments"],
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

	private async processImages(
		images: string[],
	): Promise<messageAttachmentType[]> {
		const imageBuffers = await Promise.all(
			images.map(async (image) => {
				const imageBuffer = await getImageAsBuffer(image);
				if (!imageBuffer.data) return null;
				return {
					type: "image",
					url: image,
					base64: `data:image/png;base64,${Buffer.from(
						await sharp(imageBuffer.data).webp({ quality: 100 }).toBuffer(),
					).toString("base64")}`,
				} satisfies messageAttachmentType;
			}),
		);
		if (!imageBuffers.length) return [];

		return imageBuffers.filter((img) => img !== null);
	}

	private async processImageAnalysis(images: string[]) {
		const imageAnalysis = await Promise.all(
			images.map((image) => AiUtils.analyzeImageContent(image)),
		).then((res) => res.filter((r) => r !== null));
		let imagesMessage = "";
		if (!imageAnalysis.length) return null;

		imagesMessage = "--- IMAGE ANALYSIS ---\n";
		for (const analysis of imageAnalysis) {
			imagesMessage += `Image Description: ${analysis.description}\n`;
			if (analysis.emotions && analysis.emotions.length > 0) {
				imagesMessage += `Image Emotions: ${analysis.emotions.join(", ")}\n`;
			}
			imagesMessage +=
				"\nPlease incorporate this image analysis in your response and respond as if you can see the image.\n";
		}
		imagesMessage += "----------------------\n";

		return imagesMessage ?? null;
	}
}
