// make a command that sends a message to a specific user

import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import {
	AttachmentBuilder,
	type CacheType,
	type CommandInteraction,
	type TextBasedChannel,
} from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "channel-id",
		description: "The ID of the channel to get the chat history from",
	})
	.addStringOption({
		name: "user-id",
		description: "The ID of the user to get the chat history from",
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
			const userId = this.options["user-id"];

			let channel: TextBasedChannel | null = null;

			if (channelId) {
				const channel = await interaction.client.channels.fetch(channelId);
				console.log("channel", channel);
				if (!channel || !channel.isDMBased()) {
					interaction.editReply("Invalid channel");
					return;
				}
			}

			if (userId) {
				const user = await interaction.client.users.fetch(userId);
				if (!user) {
					interaction.editReply("Invalid user");
					return;
				}

				const dmChannel = await user.dmChannel?.fetch();

				if (!dmChannel || !dmChannel.isDMBased()) {
					interaction.editReply("Invalid channel");
					return;
				}

				channel = dmChannel;
			}

			if (!channel) {
				interaction.editReply("Invalid channel");
				return;
			}

			const messages = await channel.messages.fetch({ limit: 100 });
			const messageTxt = messages
				.filter((msg) => !!msg.content)
				.map(
					(msg) =>
						`${msg.createdAt.toLocaleString()}: ${msg.author.username}: ${msg.content}`,
				)
				.join("\n");
			const attachment = new AttachmentBuilder(
				Buffer.from(messageTxt, "utf-8"),
				{
					name: "chat-history.txt",
				},
			);
			await interaction.editReply({ files: [attachment] });
		} catch (error) {
			console.error("[send-message-to] Failed to send message", error);
			interaction.editReply("Failed to send message");
		}
	}
}
