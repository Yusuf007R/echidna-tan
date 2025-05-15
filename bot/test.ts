import { eq, sql } from "drizzle-orm";
import db from "./src/drizzle";
import { memoriesTable } from "./src/drizzle/schema";
import { openAI } from "./src/utils/request";

async function retrieveMemories(messages: string) {
	const embed = await openAI.embeddings.create({
		model: "text-embedding-3-small",
		input: messages,
	});
	const embeddings = embed.data.at(0)?.embedding;
	if (!embeddings) return [];

	console.time("retrieveMemories");
	const topMemories = await db
		.select({
			id: memoriesTable.id,
			memory: memoriesTable.memory,
			date: memoriesTable.createdAt,
			distance: sql<number>`vector_distance_cos(embeds, vector32(${JSON.stringify(embeddings)}))`,
		})
		.from(
			sql`vector_top_k('vector_memories_embeds', vector32(${JSON.stringify(embeddings)}), 3) as v`,
		)
		.leftJoin(memoriesTable, sql`${memoriesTable}.rowid = v.id`)
		.where(eq(memoriesTable.userId, "320065552389242880"));
	console.timeEnd("retrieveMemories");
	return topMemories;
}

async function main() {
	const memories = await retrieveMemories("usa");
	console.log(memories);
}

// biome-ignore lint/nursery/noFloatingPromises: xsss
main();
