import { getTableColumns, isTable } from "drizzle-orm";
import * as schema from "./src/drizzle/schema";

for (const table of Object.values(schema)) {
	if (isTable(table)) {
		const columns = getTableColumns(table);

		for (const column of Object.values(columns)) {
			if (Number.isInteger(column?.config?.fieldConfig?.dimensions)) {
				console.log(column.name);
			}
		}
	}
}
