import {
	CommandValidator,
	type CommandValidatorNext,
} from "@Structures/command-validator";
import type { CacheType, Interaction } from "discord.js";

export default class GuildOnly extends CommandValidator {
	constructor() {
		super({
			name: "GuildOnly",
			description: "Events that can only be used in guilds.",
			message: "This command can only be used in guilds.",
		});
	}

	async isValid(
		interaction: Interaction<CacheType>,
		next: CommandValidatorNext,
	) {
		if (!interaction.inGuild()) {
			return this.sendMessage(interaction);
		}
		next();
	}
}
