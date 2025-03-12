import { zodFunction } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { z } from "zod";
import { openRouterAPI } from "./src/utils/request";

const messages = [
	{ role: "user", content: "Hello, whats the weather in Tokyo?" },
] as ChatCompletionMessageParam[];

const generateResponse = async () => {
	const tools = [
		{
			name: "get_weather",
			parameters: z.object({
				city: z.string(),
			}),
			description: "Get the weather for a specific city",
		},
	];
	const completion = await openRouterAPI.beta.chat.completions.parse({
		model: "openai/gpt-4o",
		messages,
		tools: tools.map((tool) =>
			zodFunction({
				name: tool.name,
				parameters: tool.parameters,
				description: tool.description,
			}),
		),
	});

	console.log(JSON.stringify(completion, null, 2));

	const toolCalls = completion.choices.at(0)?.message.tool_calls;
	if (!toolCalls) return;

	for (const toolCall of toolCalls) {
		if (toolCall.function.name !== "get_weather") continue;
		messages.push({
			role: "tool",
			content: "Weather in Tokyo is sunny and 70 degrees",
			tool_call_id: toolCall.id,
		});
	}

	// Get the final response after tool calls

	generateResponse();
};

generateResponse().catch(console.error);
