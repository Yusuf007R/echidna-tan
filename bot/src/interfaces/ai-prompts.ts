import type { Constructor } from "@Interfaces/utils";
import type { Tool } from "@Structures/tool";

type AiPromptBase = {
	name: string;
	chat_examples?: string[];
	system_message: string;
	last_system_message?: string;
	tools?: Constructor<Tool<any>>[];
};

type extraConfig = "memory" | "user_name" | "current_date";

type WithPromptConfig<T, A = undefined, X = keyof T | extraConfig> = T & {
	prompt_config: A extends undefined ? X[] : (A | X)[];
};

type AiRpPromptBase = AiPromptBase & {
	type: "roleplay";
	extra_information?: string;
	personality: string;
	interaction_context?: string;
	initial_message?: string[];
	description: string;
};

type AiAssistantPromptBase = AiPromptBase & {
	type: "assistant";
};

export type AiRpPrompt = WithPromptConfig<AiRpPromptBase>;
export type AiAssistantPrompt = WithPromptConfig<AiAssistantPromptBase>;

export type AiPrompt = AiRpPrompt | AiAssistantPrompt;
