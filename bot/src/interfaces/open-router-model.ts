export interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: Architecture;
  pricing: Pricing;
  top_provider: TopProvider;
  per_request_limits: null;
}

export interface Architecture {
  modality: Modality;
  tokenizer: Tokenizer;
  instruct_type: null | string;
}

export enum Modality {
  TextImageText = 'text+image->text',
  TextText = 'text->text'
}

export enum Tokenizer {
  Claude = 'Claude',
  Cohere = 'Cohere',
  GPT = 'GPT',
  Gemini = 'Gemini',
  Llama2 = 'Llama2',
  Llama3 = 'Llama3',
  Mistral = 'Mistral',
  Other = 'Other',
  PaLM = 'PaLM',
  Qwen = 'Qwen',
  Router = 'Router',
  Yi = 'Yi'
}

export interface Pricing {
  prompt: string;
  completion: string;
  image: string;
  request: string;
}

export interface TopProvider {
  context_length: number | null;
  max_completion_tokens: number | null;
  is_moderated: boolean;
}
