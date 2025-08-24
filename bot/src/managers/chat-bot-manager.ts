import db from "@Drizzle/db";
import { chatsTable, messagesTable, userTable } from "@Drizzle/schema";
import type { AiPrompt } from "@Interfaces/ai-prompts";

import ChatBot from "@AiStructures/chat-bot";
import type { ModelMessage } from "ai";
import type { DMChannel, ThreadChannel } from "discord.js";
import { desc, eq, type InferSelectModel } from "drizzle-orm";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export type OpenRouterModel = {
	id: string;
	name: string;
	inputs: ("text" | "audio" | "video" | "image" | "file")[];
	allowedProviders?: string[];
};

export const openRouterModels: OpenRouterModel[] = [
	{
		id: "openai/gpt-5-mini",
		name: "OpenAI GPT-5 Mini",
		inputs: ["text", "image", "file"],
	},
];

export default class ChatBotManager {
	private static chatBots: Map<string, ChatBot> = new Map();
	private static promptsTemplates: {
		name: string;
		promptTemplate: AiPrompt;
	}[] = [];

	static getModelList(searchTerm?: string): OpenRouterModel[] {
		const modelList = openRouterModels;
		const searchTerms = searchTerm?.toLowerCase().split(" ");
		if (!searchTerms?.length) return modelList;

		const filtered = modelList
			.map((model) => {
				const nameLower = model.name.toLowerCase();
				const idLower = model.id.toLowerCase();

				let score = 0;

				for (const term of searchTerms) {
					if (nameLower.startsWith(term)) {
						score += 4;
					} else if (nameLower.includes(term)) {
						score += 2;
					} else if (idLower.includes(term)) {
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

	static async createChatBot(
		channel: DMChannel | ThreadChannel,
		user: InferSelectModel<typeof userTable>,
		promptTemplate: AiPrompt,
		modelId: string,
	) {
		const model = await ChatBotManager.getModel(modelId);
		if (!model) return null;

		// const [chat] = await db
		// 	.insert(chatsTable)
		// 	.values({
		// 		channelId: channel.id,
		// 		userId: user.id,
		// 		modelId,
		// 		name: promptTemplate.name,
		// 		promptTemplate: promptTemplate.name,
		// 	})
		// 	.returning();

		// if (!chat) return null;
		const chatBot = ChatBot.init({
			channel,
			model,
			user,
			prompt: promptTemplate,
		});

		ChatBotManager.chatBots.set(channel.id, chatBot);
		return chatBot;
	}

	static async getChatBot(channel: DMChannel | ThreadChannel) {
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

		const user = await db.query.userTable.findFirst({
			where: eq(userTable.id, chat.userId),
		});
		if (!user) return null;

		const chatBot = await ChatBot.init({
			channel,
			model,
			user,
			prompt: promptTemplate.promptTemplate,
			chat,
			messageHistory,
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

		const mappedMessages = messages
			.map((msg) => {
				return {
					role: msg.role,
					content: msg.content,
					attachments: [],
				};
			})
			.reverse();

		return mappedMessages satisfies ModelMessage[];
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
		return (await ChatBotManager.getPromptsTemplates()).find(
			(prompt) => prompt.promptTemplate.name === name,
		);
	}
}
