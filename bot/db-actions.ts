import { sql } from "drizzle-orm";
import db from "src/drizzle";

const action = process.argv[2];

if (action === "clear") {
	try {
		console.log("Clearing database...");

		// Disable foreign keys before starting
		await db.run(sql.raw("PRAGMA foreign_keys = OFF"));

		try {
			// Query all tables from SQLite master table
			const tables = await db.run(
				sql.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `),
			);

			console.log(tables);
			// Create queries for each table
			const queries = tables.rows.map((table: any) => {
				const tableName = table.name;
				console.log(`Preparing query for ${tableName}`);
				return sql.raw(`DROP TABLE IF EXISTS ${tableName}`);
			});

			// Execute each drop query individually to better handle errors
			for (const query of queries) {
				try {
					await db.run(query);
				} catch (err: any) {
					console.warn(`Warning: Error dropping table: ${err.message}`);
				}
			}

			console.log("Database cleared!");
		} finally {
			await db.run(sql.raw("PRAGMA foreign_keys = ON"));
		}
	} catch (error) {
		console.error("Error clearing database");
		console.error(error);
		process.exit(1);
	}
}
