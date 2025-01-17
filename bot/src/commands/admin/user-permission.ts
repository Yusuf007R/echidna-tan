// make a command that sends a message to a specific user

import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import { eq } from "drizzle-orm";
import db from "src/drizzle";
import { userTable } from "src/drizzle/schema";

const options = new OptionsBuilder()
	.addStringOption({
		name: "user-id",
		description: "The ID of the user to update the permission of",
		required: true,
	})
	.addBoolOption({
		name: "admin",
		description: "Update the user's admin permission",
		required: true,
	})
	.build();

export default class SendMessageToCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "user-permission",
			description: "Update a user's permission",
			options,
			validators: [IsAdmin],
			cmdType: "BOTH",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		try {
			await interaction.deferReply();
			const userId = this.options["user-id"];
			const isAdmin = this.options.admin;

			if (userId === interaction.user.id) {
				interaction.editReply("You cannot update your own permission, silly");
				return;
			}

			await db
				.update(userTable)
				.set({
					isAdmin,
				})
				.where(eq(userTable.id, userId));

			interaction.editReply("User permission updated");
		} catch (error) {
			console.error(
				"[user-permission] Failed to update user permission",
				error,
			);
			interaction.editReply("Failed to update user permission");
		}
	}
}
