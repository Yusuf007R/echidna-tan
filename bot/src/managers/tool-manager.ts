import type { Tool } from "@Structures/tool";
import { getBaseDir } from "@Utils/get-dir-name";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Collection } from "discord.js";

export default class ToolManager {
	private tools: Collection<string, Tool>;

	constructor() {
		this.tools = new Collection<string, Tool>();
	}

	async loadTools() {
		const toolsRootFolder = join(getBaseDir(), "../ai-stuff/tools");
		await Promise.all(
			readdirSync(toolsRootFolder)
				.filter(
					(file) =>
						!RegExp(/\[.*\]/gm).test(file) &&
						(file.endsWith(".ts") || file.endsWith(".js")) &&
						!file.endsWith(".d.ts"),
				)
				.map(async (file) => {
					const { default: ToolClass } = await import(
						join(toolsRootFolder, file)
					);
					const tool = new ToolClass() as Tool;
					this.tools.set(tool.name, tool);
				}),
		);
	}

	getTool(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	async executeTool(name: string, params: Record<string, any>) {
		const tool = this.getTool(name);
		if (!tool) {
			throw new Error(`Tool ${name} not found`);
		}

		// Validate parameters using Zod schema
		const validatedParams = tool.schema.parse(params);
		return await tool.run(validatedParams);
	}

	getAllTools(): Tool[] {
		return Array.from(this.tools.values());
	}

	getToolsAsJSON() {
		return this.getAllTools().map((tool) => tool.toJSON());
	}
}
