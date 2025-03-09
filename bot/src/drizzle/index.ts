import config from "@Configs";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const turso = createClient({
	url: config.TURSO_DATABASE_URL,
	authToken: config.TURSO_AUTH_TOKEN,
});

const db = drizzle(turso, { schema });

export type dbType = typeof db;

export type DbTransactionType = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export const createVectorIndex = async () => {
	await Promise.all([
		db.run(sql`
		CREATE INDEX IF NOT EXISTS vector_memories
		ON memories (libsql_vector_idx(embeds))
	`),
		db.run(sql`
		CREATE INDEX IF NOT EXISTS vector_messages
		ON messages (libsql_vector_idx(embeds))
	`),
	]);
};

export default db;
