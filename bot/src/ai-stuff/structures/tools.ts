import type { Constructor } from "@Interfaces/utils";
import type { Tool } from "@Structures/tool";
import { openRouterAPI } from "@Utils/request";

export default class ToolsManager {
	constructor(private tools: Constructor<Tool<any>>[]) {}

	async promptTools(prompt: string) {
		const tools = this.tools.map((ToolClass) => {
			return new ToolClass();
		});

		const response = await openRouterAPI.beta.chat.completions.parse({
			model: "google/gemini-2.0-flash-001",
			messages: [
				{
					role: "system",
					content: `
          You are a tool calling assistant.
          You will be given a prompt and you will need to call the appropriate tool with the correct parameters.
          `,
				},
				{
					role: "user",
					content: prompt,
				},
			],
			tools: tools.map((tool) => tool.toJSON()),
		});
		console.log(response);

		for (const toolCall of response.choices[0].message.tool_calls) {
			const tool = tools.find((tool) => tool.name === toolCall.function.name);
			if (!tool) continue;
			const result = await tool.run(toolCall.function.parsed_arguments);
			console.log(result);
		}
	}
}
