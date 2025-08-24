import type { Constructor } from "@Interfaces/utils";
import type { Tool } from "@Structures/tool";

export type AiPrompt = {
	name: string;
	chat_examples?: string[];
	system_message: string;
	last_system_message?: string;
	tools?: Constructor<Tool<any>>[];
};
