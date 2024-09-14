type AiPromptBase = {
  name: string;
  chat_examples?: string[];
  system_message: string;
  last_system_message?: string;
};

type WithPromptConfig<T> = T & {
  prompt_config: (keyof T)[];
};

type AiRpPromptBase = AiPromptBase & {
  type: 'roleplay';
  extra_information?: string;
  personality: string;
  interaction_context?: string;
  initial_message?: string[];
  description: string;
};

type AiAssistantPromptBase = AiPromptBase & {
  type: 'assistant';
};

export type AiRpPrompt = WithPromptConfig<AiRpPromptBase>;
export type AiAssistantPrompt = WithPromptConfig<AiAssistantPromptBase>;

export type AiPrompt = AiRpPrompt | AiAssistantPrompt;
