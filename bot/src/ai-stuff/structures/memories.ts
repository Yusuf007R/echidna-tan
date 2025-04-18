import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Interfaces/open-router-model";
import ChatBotManager from "@Managers/chat-bot-manager";
import calcCompletionUsage from "@Utils/calc-completion-usage";
import { openAI, openRouterAPI } from "@Utils/request";
import { type InferSelectModel, desc, eq, sql } from "drizzle-orm";
import { zodFunction } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import db from "src/drizzle";
import {
	chatsTable,
	memoriesTable,
	messagesTable,
	type userTable,
} from "src/drizzle/schema";
import z from "zod";

export const memoryAIResponseSchema = z.object({
	memory: z.string(),
});

export default class MemoriesManager {
	NUMBER_OF_MESSAGES_TO_PROCESS = 10;
	MODEL_NAME = "google/gemini-2.5-pro-preview-03-25";
	model: OpenRouterModel | undefined;
	constructor(
		private chat: InferSelectModel<typeof chatsTable>,
		private user: InferSelectModel<typeof userTable>,
		private prompt: AiPrompt,
	) {}

	private async insertMemories(
		memories: z.infer<typeof memoryAIResponseSchema>[],
		messageId: number,
	) {
		await db.transaction(async (tx) => {
			const promises = memories.map(async (memory) => {
				const embed = await openAI.embeddings.create({
					model: "text-embedding-3-small",
					input: memory.memory,
				});

				const embeddings = embed.data.at(0)?.embedding;
				if (!embeddings) return;

				await tx.insert(memoriesTable).values({
					userId: this.chat.userId,
					memory: memory.memory,
					importance: 0.5,
					memoryType: "user",
					embeds: embeddings,
					promptTemplate: this.chat.promptTemplate,
				});

				console.log("Memory added");
			});
			await Promise.all(promises);
		});
	}

	async messagesProcessor(
		messages: InferSelectModel<typeof messagesTable>[],
		existingMemoriesProp?: z.infer<typeof memoryAIResponseSchema>[],
		retry = 0,
	): Promise<z.infer<typeof memoryAIResponseSchema>[]> {
		const existingMemories =
			existingMemoriesProp === undefined
				? await this.retrieveMemories(
						messages.map((msg) => msg.content).join("\n"),
					)
				: existingMemoriesProp;

		try {
			const memoriesAdded: z.infer<typeof memoryAIResponseSchema>[] = [];
			const tools = [
				{
					name: "save-memory",
					parameters: memoryAIResponseSchema,
					description: `Use this tool to save an important piece of information as a memory. You can include multiple related pieces of information in a single memory.
						
						memory: the content of the memory - can contain multiple pieces of related information.
					`,
				},
			];
			const messagesString = messages.reduce(
				(acc, msg) =>
					`${acc}\n${msg.role === "user" ? this.user.displayName : this.prompt.name}: ${msg.content}`,
				"",
			);

			console.log("Messages string", messagesString);
			const llmMessages = [
				{
					role: "system",
					content: `
					You are a specialized memory extraction system designed to identify and save important information from conversations. Your task is to analyze messages and extract memories that would be valuable for future interactions.

					CONTEXT: This is a conversation between chatbot: ${this.prompt.name} and user: ${this.user.displayName}.

					CRITICAL INSTRUCTION - EXTRACT COMPREHENSIVE MEMORIES:
					You should identify and save information as memories that capture the user's details, preferences, and background.
					
					A single memory can and should contain multiple related pieces of information. For example, if a message contains "I'll tell you more stuff about me, I'm a software developer and I love hiking on weekends", you should create a comprehensive memory like "User is a software developer who loves hiking on weekends".
					
					Be very specific and detailed. Capture the full context and richness of what the user shares.

					CRITICAL INSTRUCTION - DUPLICATE PREVENTION:
					Check if information already exists in the database, but be careful not to over-filter.
					IMPORTANT: Different preferences, facts, or pieces of information are NOT duplicates even if they are similar in type.
					For example:
					- If "User likes pink" exists and user says "I also like blue" → SAVE "User likes blue" as a NEW memory
					- If "User is a software developer" exists and user says "I also work as a consultant" → SAVE "User works as a consultant" as a NEW memory
					- If "User likes pink" exists and user says "I like pink and blue" → SAVE "User likes blue" as a NEW memory
					- If "User likes pink" exists and user says "I live in the moon and I like pink" → SAVE "User lives in the moon" as a NEW memory

					
					Only consider information a duplicate if it's essentially restating the same exact fact or preference.
					For example:
					- If "User likes dogs" exists and user says "I love dogs" → DON'T save (same information)
					- If "User is 30 years old" exists and user says "I'm 30" → DON'T save (same information)
					
					Compare your potential new memories with each database entry and save ALL genuinely new information.

					EXISTING DATABASE MEMORIES:
					${existingMemories.map((mem) => `• "${mem.memory}"`).join("\n					")}
				
					WHAT TO SAVE:
					✓ Personal information (name, location, occupation, family details)
					✓ Strong preferences and dislikes
					✓ Significant life events and experiences
					✓ Goals, plans, and aspirations
					✓ Recurring topics of interest
					✓ Relationship dynamics between user and assistant
					✓ Communication style preferences

					WHAT NOT TO SAVE:
					✗ Temporary states or moods
					✗ Casual small talk without personal significance
					✗ General knowledge not specific to the user
					✗ Highly repetitive information
					✗ Obvious or trivial details
					✗ ANY information already in the database (even with slight wording differences)

					Your sole purpose is memory extraction - do not respond to or interact with the user directly.
				`,
				},
				{
					role: "user",
					content: messagesString,
				},
			] satisfies ChatCompletionMessageParam[];
			const completion = await openRouterAPI.beta.chat.completions.parse({
				model: this.MODEL_NAME,
				messages: llmMessages,
				tools: tools.map((tool) =>
					zodFunction({
						name: tool.name,
						parameters: tool.parameters,
						description: tool.description,
					}),
				),
			});
			const toolCalls = completion.choices.at(0)?.message.tool_calls;
			if (!this.model || !completion.usage)
				throw new Error("Model or usage not found");
			const { totalCost } = calcCompletionUsage(completion.usage, this.model);
			if (!toolCalls) return memoriesAdded;
			for (const toolCall of toolCalls) {
				if (toolCall.function.name !== "save-memory") continue;
				const parsed = toolCall.function.parsed_arguments as z.infer<
					typeof memoryAIResponseSchema
				>;
				console.log(
					`Memory detected: ${parsed.memory} for prompt: ${this.prompt.name} for user: ${this.user.displayName} for ${totalCost}`,
				);
				memoriesAdded.push(parsed);
			}

			await this.insertMemories(memoriesAdded, 0);

			return memoriesAdded;
		} catch (error) {
			console.error(error);
			if (retry < 3) {
				return this.messagesProcessor(
					messages,
					existingMemoriesProp,
					retry + 1,
				);
			}
			return [];
		}
	}

	async retrieveMemories(messages: string) {
		const embed = await openAI.embeddings.create({
			model: "text-embedding-3-small",
			input: messages,
		});
		const embeddings = embed.data.at(0)?.embedding;
		if (!embeddings) return [];

		const topMemories = await db
			.select({
				id: memoriesTable.id,
				memory: memoriesTable.memory,
				date: memoriesTable.createdAt,
			})
			.from(
				sql`vector_top_k('vector_memories', vector32(${JSON.stringify(embeddings)}), 10) as v`,
			)
			.leftJoin(memoriesTable, sql`${memoriesTable}.rowid = v.id`)
			.where(eq(memoriesTable.userId, this.user.id));

		return topMemories;
	}

	async getChatMessages() {
		const chat = await db.query.chatsTable.findFirst({
			where: eq(chatsTable.id, this.chat.id),
			with: {
				messages: {
					where: eq(messagesTable.wasMemoryProcessed, false),
					orderBy: desc(messagesTable.createdAt),
				},
			},
		});
		if (!chat) throw new Error("[MemoriesManager] Chat not found");
		return chat;
	}

	async loadModel() {
		if (this.model) return;
		const model = await ChatBotManager.getModel(this.MODEL_NAME);
		if (!model) throw new Error("[MemoriesManager] Model not found");
		this.model = model;
	}

	async manageMemory() {
		await this.loadModel();
		console.log("Managing memory");
		const chat = await this.getChatMessages();
		console.log(`Chat messages: ${chat.messages.length}`);
		if (chat.messages.length < this.NUMBER_OF_MESSAGES_TO_PROCESS) return;
		console.log("Processing messages");
		await this.messagesProcessor(chat.messages);

		await db
			.update(messagesTable)
			.set({ wasMemoryProcessed: true })
			.where(
				sql`${messagesTable.id} IN (${chat.messages.map((msg) => msg.id).join(",")})`,
			);
	}
}
