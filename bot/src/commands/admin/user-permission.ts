// make a command that sends a message to a specific user

import IsAdmin from "@EventsValidators/isAdmin";
import { UserManager } from "@Managers/user-manager";
import { Command } from "@Structures/command";
import { InteractionContext } from "@Structures/interaction-context";
import { OptionsBuilder } from "@Utils/options-builder";

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

	async run() {
		try {
			await InteractionContext.deferReply();
			const userId = this.options["user-id"];
			const isAdmin = this.options.admin;

			if (userId === InteractionContext.user.id) {
				await InteractionContext.editReply(
					"You cannot update your own permission, silly",
				);
				return;
			}

			await UserManager.updateUser(userId, {
				isAdmin,
			});

			await InteractionContext.editReply("User permission updated");
		} catch (error) {
			console.error(
				"[user-permission] Failed to update user permission",
				error,
			);
			await InteractionContext.editReply("Failed to update user permission");
		}
	}
}
