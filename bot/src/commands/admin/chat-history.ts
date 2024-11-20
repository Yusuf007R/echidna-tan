// make a command that sends a message to a specific user

import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import {
	AttachmentBuilder,
	type CacheType,
	type CommandInteraction,
} from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "channel-id",
		description: "The ID of the channel to get the chat history from",
		required: true,
	})
	.build();

export default class ChatHistoryCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "chat-history",
			description: "Get the chat history from a specific channel",
			options,
			validators: [IsAdmin],
			cmdType: "BOTH",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		try {
			await interaction.deferReply();
			const channelId = this.options["channel-id"];

			const channel = await interaction.client.channels.fetch(channelId);
			if (!channel || !channel.isDMBased()) {
				interaction.editReply("Invalid channel");
				return;
			}

			const messages = await channel.messages.fetch({ limit: 100 });
			const messageTxt = messages
				.map((msg) => `${msg.author.username}: ${msg.content}`)
				.join("\n");
			const attachment = new AttachmentBuilder(
				Buffer.from(messageTxt, "utf-8"),
			);
			await interaction.editReply({ files: [attachment] });
		} catch (error) {
			console.error("[send-message-to] Failed to send message", error);
			interaction.editReply("Failed to send message");
		}
	}
}
