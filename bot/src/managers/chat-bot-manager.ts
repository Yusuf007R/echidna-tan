import { readdirSync } from "node:fs";
import { join } from "node:path";
import type ChatBot from "@AiStructures/chat-bot";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Interfaces/open-router-model";
import CacheManager from "@Structures/cache-manager";
import { openRouterAPI } from "@Utils/request";

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

	static getChatBot(id: string) {
		return ChatBotManager.chatBots.get(id);
	}

	static addChatBot(id: string, chatBot: ChatBot) {
		ChatBotManager.chatBots.set(id, chatBot);
	}

	static getPromptsTemplates() {
		if (ChatBotManager.promptsTemplates.length)
			return ChatBotManager.promptsTemplates;
		const templatesPath = join(__dirname, "../ai-stuff/templates");

		for (const file of readdirSync(templatesPath)) {
			const prompt = require(`${templatesPath}/${file}`).default;
			ChatBotManager.promptsTemplates.push({
				name: file.split(".")[0],
				promptTemplate: prompt,
			});
		}
		return ChatBotManager.promptsTemplates;
	}
}
