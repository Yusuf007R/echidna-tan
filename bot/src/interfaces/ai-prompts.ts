import type { Constructor } from "@Interfaces/utils";
import type { Tool } from "@Structures/tool";

export type AiPrompt = {
	name: string;
	chat_examples?: string[];
	system_message: string;
	description?: string;
	tools?: Constructor<Tool<any>>[];
	prompt_config: (
		| "system_message"
		| "description"
		| "userName"
		| "currentDate"
		| "memory"
	)[];
};
