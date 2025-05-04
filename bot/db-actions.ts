import config from "@Configs";
import { createClient } from "@libsql/client";

const turso = createClient({
	authToken: config.TURSO_AUTH_TOKEN,
	url: config.TURSO_DATABASE_URL,
});

const action = process.argv[2];

if (action === "clear") {
	try {
		console.log("Clearing database...");
		await turso.execute("PRAGMA foreign_keys = OFF");

		try {
			// Query all tables from SQLite master table
			const tables = await turso.execute(
				`SELECT name FROM sqlite_master WHERE type = 'table';`,
			);

			console.log(tables);
			const tableNames = tables.rows.map((table: any) => table.name);

			// Create queries for each table
			const queries = tableNames.map((tableName: string) => {
				console.log(`Preparing query for ${tableName}`);
				return `DROP TABLE IF EXISTS ${tableName}`;
			});

			// Execute each drop query individually to better handle errors
			for (const query of queries) {
				try {
					await turso.execute(query);
				} catch (err: any) {
					console.warn(`Warning: Error dropping table: ${err.message}`);
				}
			}

			console.log("Database cleared!");
		} finally {
			await turso.execute("PRAGMA foreign_keys = ON");
		}
	} catch (error) {
		console.error("Error clearing database");
		console.error(error);
		process.exit(1);
	}
}
