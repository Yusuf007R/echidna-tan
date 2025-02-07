import {
	CommandValidator,
	type CommandValidatorNext,
} from "@Structures/command-validator";
import type { CacheType, Interaction } from "discord.js";
import { eq } from "drizzle-orm";

import db from "src/drizzle";
import { userTable } from "src/drizzle/schema";

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
		const user = await db.query.userTable.findFirst({
			where: eq(userTable.id, interaction.user.id),
		});
		if (!user) {
			await db.insert(userTable).values({
				id: interaction.user.id,
				displayName: interaction.user.displayName,
				userName: interaction.user.username,
				isAdmin: false,
			});
		}
		if (!user?.isAdmin) {
			this.sendMessage(interaction);

			return;
		}
		next();
	}
}
