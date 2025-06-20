import config from "@Configs";
import { createClient } from "@libsql/client";
import {
	getTableColumns,
	getTableName,
	isTable,
	type SQL,
	sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

const turso = createClient({
	authToken: config.TURSO_AUTH_TOKEN,
	url: config.TURSO_DATABASE_URL,
});

const db = drizzle(turso, { schema });

export type dbType = typeof db;

export type DbTransactionType = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export const createVectorIndex = async () => {
	// if (process.env.NODE_ENV === "development") {
	// 	return;
	// }
	const promises: Promise<any>[] = [];
	for (const table of Object.values(schema)) {
		if (isTable(table)) {
			const columns = getTableColumns(table);
			const tableName = getTableName(table);
			for (const column of Object.values(columns)) {
				if (Number.isInteger(column?.config?.fieldConfig?.dimensions)) {
					// ! yes i like it raw
					const sqlRaw = sql.raw(`
					CREATE INDEX IF NOT EXISTS vector_${tableName}_${column.name}
					ON ${tableName} (libsql_vector_idx(${column.name}))
					`);

					promises.push(db.run(sqlRaw));
				}
			}
		}
	}

	await Promise.all(promises);
};

export const initDB = async () => {
	await createVectorIndex();
};

export const buildConflictUpdateColumns = <
	T extends SQLiteTable,
	Q extends keyof T["_"]["columns"],
>(
	table: T,
	columns: Q[],
) => {
	const cls = getTableColumns(table);
	return columns.reduce(
		(acc, column) => {
			const colName = cls[column].name;
			acc[column] = sql.raw(`excluded.${colName}`);
			return acc;
		},
		{} as Record<Q, SQL>,
	);
};

export default db;
