import { openAI, openRouterAPI } from "@Utils/request";
import { type InferSelectModel, eq, sql } from "drizzle-orm";
import { zodFunction } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import db from "src/drizzle";
import { memoriesTable, type userTable } from "src/drizzle/schema";
import z from "zod";

export const memoryAIResponseSchema = z.object({
	memory: z.string(),
	importance: z.number().min(0).max(1),
	memoryType: z.enum(["user", "assistant"]),
});

export default class MemoriesManager {
	constructor(
		private user: InferSelectModel<typeof userTable>,
		private chatBotName: string,
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
					userId: this.user.id,
					memory: memory.memory,
					importance: memory.importance,
					memoryType: memory.memoryType,
					embeds: embeddings,
					promptTemplate: this.chatBotName,
					messageId,
				});

				console.log("Memory added");
			});
			await Promise.all(promises);
		});
	}

	async memorySaver(
		message: string,
		messageId: number,
		existingMemoriesProp?: z.infer<typeof memoryAIResponseSchema>[],
		retry = 0,
	): Promise<z.infer<typeof memoryAIResponseSchema>[]> {
		const existingMemories =
			existingMemoriesProp === undefined
				? await this.retrieveMemories(message)
				: existingMemoriesProp;

		try {
			const memoriesAdded: z.infer<typeof memoryAIResponseSchema>[] = [];
			const tools = [
				{
					name: "save-memory",
					parameters: memoryAIResponseSchema,
					description: `Use this tool to save an important piece of information as a memory. You can include multiple related pieces of information in a single memory.
						
						memory: the content of the memory - can contain multiple pieces of related information.
						
						memoryType: the type of the memory. can be one of the following: user, assistant.
						importance: the importance of the memory. a float number between 0 and 1. 0 is the least important and 1 is the most important.
					`,
				},
			];

			const llmMessages = [
				{
					role: "system",
					content: `
					You are a specialized memory extraction system designed to identify and save important information from conversations. Your task is to analyze messages and extract memories that would be valuable for future interactions.

					CONTEXT: This is a conversation between chatbot: ${this.chatBotName} and user: ${this.user.displayName}.

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
					${existingMemories.map((mem) => `• "${mem.memory}", ${mem.memoryType}, ${mem.importance})`).join("\n					")}
				
					MEMORY TYPES:
					- USER memories: Facts, preferences, experiences, opinions, skills, interests, goals, relationships, and background details about the user.
					- ASSISTANT memories: Information about how the assistant has interacted with the user, promises made, approaches that worked well, topics to avoid, etc.

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

					IMPORTANCE RATING GUIDELINES:
					- 0.8-1.0: Critical personal identifiers, major life events
					- 0.6-0.8: Strong preferences, significant background information
					- 0.4-0.6: Useful context, recurring interests
					- 0.2-0.4: Potentially relevant information
					- 0.0-0.2: Minimal importance but still worth recording

					Your sole purpose is memory extraction - do not respond to or interact with the user directly.
				`,
				},
				{
					role: "user",
					content: message,
				},
			] satisfies ChatCompletionMessageParam[];
			const completion = await openRouterAPI.beta.chat.completions.parse({
				model: "google/gemini-2.0-flash-001",
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
			if (!toolCalls) return memoriesAdded;
			for (const toolCall of toolCalls) {
				if (toolCall.function.name !== "save-memory") continue;
				const parsed = toolCall.function.parsed_arguments as z.infer<
					typeof memoryAIResponseSchema
				>;
				console.log(
					`Memory detected: ${parsed.memory} for prompt: ${this.chatBotName} for user: ${this.user.displayName}`,
				);
				memoriesAdded.push(parsed);
			}

			await this.insertMemories(memoriesAdded, messageId);

			return memoriesAdded;
		} catch (error) {
			console.error(error);
			if (retry < 3) {
				return this.memorySaver(
					message,
					messageId,
					existingMemoriesProp,
					retry + 1,
				);
			}
			return [];
		}
	}

	async retrieveMemories(message: string) {
		const embed = await openAI.embeddings.create({
			model: "text-embedding-3-small",
			input: message,
		});
		const embeddings = embed.data.at(0)?.embedding;
		if (!embeddings) return [];

		const topMemories = await db
			.select({
				id: memoriesTable.id,
				memory: memoriesTable.memory,
				importance: memoriesTable.importance,
				memoryType: memoriesTable.memoryType,
				date: memoriesTable.createdAt,
			})
			.from(
				sql`vector_top_k('vector_memories', vector32(${JSON.stringify(embeddings)}), 10) as v`,
			)
			.leftJoin(memoriesTable, sql`${memoriesTable}.rowid = v.id`)
			.where(eq(memoriesTable.userId, this.user.id));

		return topMemories;
	}
}
