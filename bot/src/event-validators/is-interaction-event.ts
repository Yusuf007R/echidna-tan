import {
	CommandValidator,
	type CommandValidatorNext,
} from "@Structures/command-validator";
import type { CacheType, Interaction } from "discord.js";

export default class IsInteractionEvent extends CommandValidator {
	constructor() {
		super({
			name: "IsInteractionEvent",
			description: "Events that are interactions.",
		});
	}

	// biome-ignore lint/suspicious/useAwait: there is nothing to await
	async isValid(
		interaction: Interaction<CacheType>,
		next: CommandValidatorNext,
	) {
		if (interaction.isCommand()) {
			return next();
		}
	}
}
