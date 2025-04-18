import type { OpenRouterModel } from "@Interfaces/open-router-model";
import type { CompletionUsage } from "openai/resources/completions.mjs";

export default function calcCompletionUsage(
	usage: CompletionUsage,
	model: OpenRouterModel,
) {
	const inputTokens = usage?.prompt_tokens ?? 0;
	const outputTokens = usage?.completion_tokens ?? 0;

	const promptPrice = Number.parseFloat(model.pricing.prompt);
	const completionPrice = Number.parseFloat(model.pricing.completion);

	const inputCost = inputTokens * promptPrice;
	const outputCost = outputTokens * completionPrice;

	const totalCost = inputCost + outputCost;

	return {
		promptTokens: inputTokens,
		completionTokens: outputTokens,
		promptPrice,
		completionPrice,
		inputCost,
		outputCost,
		totalCost,
	};
}
