import { UserManager } from "@Managers/user-manager";
import {
	CommandValidator,
	type CommandValidatorNext,
} from "@Structures/command-validator";
import type { CacheType, Interaction } from "discord.js";

export default class IsAdmin extends CommandValidator {
	constructor() {
		super({
			name: "IsAdmin",
			description: "Events that can only be used by admins.",
			message: "This command can only be used by admins.",
		});
	}

	async isValid(
		interaction: Interaction<CacheType>,
		next: CommandValidatorNext,
	) {
		const user = await UserManager.getOrCreateUser(interaction.user.id);
		if (!user?.isAdmin) {
			this.sendMessage(interaction);
			return;
		}
		next();
	}
}
