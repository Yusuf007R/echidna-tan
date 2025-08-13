// make a command that sends a message to a specific user

import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import { InteractionContext } from "@Structures/interaction-context";
import { OptionsBuilder } from "@Utils/options-builder";

const options = new OptionsBuilder()
	.addStringOption({
		name: "user-id",
		description: "The ID of the user to send the message to",
		required: true,
	})
	.addStringOption({
		name: "message",
		description: "The message to send to the user",
		required: true,
	})
	.build();

export default class SendMessageToCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "send-message-to",
			description: "Send a message to a specific user",
			options,
			validators: [IsAdmin],
			cmdType: "BOTH",
		});
	}

	async run() {
		const userId = this.options["user-id"];
		const message = this.options.message;

		try {
			const user = await this.echidna.users.fetch(userId);
			if (!user) {
				await InteractionContext.editReply("User not found.");
				return;
			}

			await user.send(message);
			await InteractionContext.editReply(
				`Message sent to ${user.tag}: "${message}"`,
			);
		} catch (error) {
			console.error("Error sending message:", error);
			await InteractionContext.editReply(
				"Failed to send message. The user might have DMs disabled or blocked the bot.",
			);
		}
	}
}
