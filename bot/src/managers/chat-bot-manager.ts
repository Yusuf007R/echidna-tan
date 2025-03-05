import ChatBot from "@AiStructures/chat-bot";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Interfaces/open-router-model";
import CacheManager from "@Managers/cache-manager";
import { openRouterAPI } from "@Utils/request";
import type { TextChannel, ThreadChannel } from "discord.js";
import { type InferSelectModel, desc, eq } from "drizzle-orm";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import db from "src/drizzle";
import { chatsTable, messagesTable, type userTable } from "src/drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type messageHistoryType = {
	author: "user" | "assistant" | "system";
	content: string;
};
export default class ChatBotManager {
	private static chatBots: Map<string, ChatBot> = new Map();
	private static promptsTemplates: {
		name: string;
		promptTemplate: AiPrompt;
	}[] = [];
	private static async _getModelList(): Promise<OpenRouterModel[]> {
		const cacheKey = "open-router-model-list";

		const cached = CacheManager.get(cacheKey);
		if (cached) return cached as any;

		const list = (await openRouterAPI.models.list()).data;
		CacheManager.set(cacheKey, list, {
			ttl: CacheManager.TTL.oneDay,
		});
		return list as any;
	}

	static async getModelList(searchTerm?: string): Promise<OpenRouterModel[]> {
		const modelList = await ChatBotManager._getModelList();
		const searchTerms = searchTerm?.toLowerCase().split(" ");
		if (!searchTerms?.length) return modelList;

		const filtered = modelList
			.map((model) => {
				const nameLower = model.name.toLowerCase();
				const descLower = model.description.toLowerCase();
				const idLower = model.id.toLowerCase();

				let score = 0;

				for (const term of searchTerms) {
					if (nameLower.startsWith(term)) {
						score += 4;
					} else if (nameLower.includes(term)) {
						score += 2;
					} else if (idLower.includes(term) || descLower.includes(term)) {
						score += 1;
					}
				}

				return { ...model, score };
			})
			.filter((model) => model.score > 0)
			.sort((a, b) => b.score - a.score);

		return filtered;
	}

	static async getModel(id: string) {
		return (await ChatBotManager.getModelList()).find(
			(model) => model.id === id,
		);
	}

	static async getChatBot(
		channel: TextChannel | ThreadChannel,
		user: InferSelectModel<typeof userTable>,
	) {
		const chatBotCache = ChatBotManager.chatBots.get(channel.id);
		if (chatBotCache) return chatBotCache;

		const chat = await db.query.chatsTable.findFirst({
			where: eq(chatsTable.channelId, channel.id),
		});

		if (!chat) return null;

		const messageHistory = await ChatBotManager.loadChats(chat);

		const model = await ChatBotManager.getModel(chat.modelId);
		if (!model) return null;

		const promptTemplate = await ChatBotManager.getPromptTemplate(
			chat.promptTemplate,
		);
		if (!promptTemplate) return null;

		const chatBot = await ChatBot.init({
			channel,
			model: model,
			user: user,
			prompt: promptTemplate.promptTemplate,
			chat: chat,
			messageHistory: messageHistory,
		});

		ChatBotManager.chatBots.set(channel.id, chatBot);
		return chatBot;
	}

	static async loadChats(chat: InferSelectModel<typeof chatsTable>) {
		const messages = await db.query.messagesTable.findMany({
			where: eq(messagesTable.chatId, chat.id),
			orderBy: desc(messagesTable.createdAt),
			limit: 45,
		});

		const mappedMessages = messages.map((msg) => {
			return {
				author: msg.authorId === chat.userId ? "user" : "assistant",
				content: msg.content,
			};
		});

		return mappedMessages as messageHistoryType[];
	}

	static async getPromptsTemplates() {
		if (ChatBotManager.promptsTemplates.length)
			return ChatBotManager.promptsTemplates;

		const templatesPath = join(__dirname, "/ai-stuff/templates");
		const templateFiles = readdirSync(templatesPath).filter((file) =>
			file.endsWith(".js"),
		);
		for (const file of templateFiles) {
			const prompt = (await import(`${templatesPath}/${file}`)).default;
			ChatBotManager.promptsTemplates.push({
				name: file.split(".")[0],
				promptTemplate: prompt,
			});
		}
		return ChatBotManager.promptsTemplates;
	}

	static async getPromptTemplate(name: string) {
		return ChatBotManager.promptsTemplates.find(
			(prompt) => prompt.name === name,
		);
	}
}
