import { openAI, openRouterAPI } from "@Utils/request";
import { type InferSelectModel, and, desc, eq } from "drizzle-orm";
import { zodFunction } from "openai/helpers/zod";
import db from "src/drizzle";
import { memoriesTable, type userTable } from "src/drizzle/schema";
import z from "zod";

const memoryAIResponseSchema = z.object({
	memory: z.string(),
});

export default class MemoriesManager {
	private memories: InferSelectModel<typeof memoriesTable>[] = [];

	constructor(
		private user: InferSelectModel<typeof userTable>,
		private chatBotName: string,
	) {}

	async loadMemories() {
		this.memories = await db
			.select()
			.from(memoriesTable)
			.where(
				and(
					eq(memoriesTable.userId, this.user.id),
					eq(memoriesTable.prompt, this.chatBotName),
				),
			)
			.orderBy(desc(memoriesTable.createdAt))
			.limit(50);

		console.log(`Memories loaded from db: ${this.memories.length}`);
	}

	private async addMemory(memory: string) {
		if (!memory) return;
		const embed = await openAI.embeddings.create({
			model: "text-embedding-3-small",
			input: memory,
		});
		const embeddings = embed.data.at(0)?.embedding;
		if (!embeddings) return;
		const [dbMemory] = await db
			.insert(memoriesTable)
			.values({
				userId: this.user.id,
				memory,
				memoryLength: memory.length,
				embeds: embeddings,
				prompt: this.chatBotName,
			})
			.returning();
		console.log("Memory added");
		if (this.memories.length >= 50) this.memories.shift();
		this.memories.push(dbMemory);
	}

	getMemories() {
		return this.memories.toReversed();
	}

	async memorySaver(message: string) {
		const tools = [
			{
				name: "save-memory",
				parameters: memoryAIResponseSchema,
				description:
					"Use this tool to save memories. Memories are information about the users, such as their name, age, or any other relevant details.",
			},
		];

		const completion = await openRouterAPI.beta.chat.completions.parse({
			model: "google/gemini-2.0-flash-001",
			messages: [
				{
					role: "system",
					content: `
          You are a helpful assistant that can save memories. Memories are information about the users, such as their name, age, or any other relevant details like things they are doing, places they are from, their hobbies, their interests, etc.
					this is a conversation between chatbot: ${this.chatBotName} and the user : ${this.user.displayName}, you are a memory saver, do not talk to the user, your job is to save memories about the user. 
          save-memory: Use this tool to save memories. It should have a little description of the memory.
        `,
				},
				{ role: "user", content: message },
			],
			tools: tools.map((tool) =>
				zodFunction({
					name: tool.name,
					parameters: tool.parameters,
					description: tool.description,
				}),
			),
		});
		const toolCalls = completion.choices.at(0)?.message.tool_calls;
		if (!toolCalls) return;
		for (const toolCall of toolCalls) {
			if (toolCall.function.name !== "save-memory") continue;
			const parsed = toolCall.function.parsed_arguments as z.infer<
				typeof memoryAIResponseSchema
			>;
			console.log(
				`Memory detected: ${parsed.memory} for prompt: ${this.chatBotName} for user: ${this.user.displayName}`,
			);
			this.addMemory(parsed.memory);
		}
	}
}
