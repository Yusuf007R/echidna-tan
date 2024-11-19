import { openRouterAPI } from "@Utils/request";
import { type InferSelectModel, desc, eq } from "drizzle-orm";
import { zodFunction } from "openai/helpers/zod";
import db from "src/drizzle";
import { memoriesTable, type usersTable } from "src/drizzle/schema";
import z from "zod";

const memoryAIResponseSchema = z.object({
	memory: z.string(),
});

export default class MemoriesManager {
	private memories: InferSelectModel<typeof memoriesTable>[] = [];

	constructor(private user: InferSelectModel<typeof usersTable>) {}

	async loadMemories() {
		this.memories = await db
			.select()
			.from(memoriesTable)
			.where(eq(memoriesTable.userId, this.user.discordId))
			.orderBy(desc(memoriesTable.createdAt))
			.limit(50);

		console.log(`Memories loaded from db: ${this.memories.length}`);
	}

	private async addMemory(memory: string) {
		// if (!memory) return;
		// const embed = await openAI.embeddings.create({
		//   model: 'text-embedding-3-small',
		//   input: memory
		// });
		// const embeddings = embed.data.at(0)?.embedding;
		// if (!embeddings) return;
		// const [dbMemory] = await db
		//   .insert(memoriesTable)
		//   .values({
		//     userId: this.user.discordId,
		//     memory,
		//     memoryLength: memory.length,
		//     embed: embeddings
		//   })
		//   .returning();
		// console.log(`Memory added`);
		// if (this.memories.length >= 50) this.memories.shift();
		// this.memories.push(dbMemory);
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
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `
          User's name: ${this.user.displayName} 
          You are a helpful assistant that can save memories. Memories are information about the users, such as their name, age, or any other relevant details like things they are doing, places they are from, their hobbies, their interests, etc.
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
			console.log(`Memory detected: ${parsed.memory}`);
			this.addMemory(parsed.memory);
		}
	}
}
