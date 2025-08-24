import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";

const options = new OptionsBuilder().build();

export default class ChatInfoCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "chat-info",
			description: "Show the info of a chat",
			options,
			shouldDefer: true,
			cmdType: "BOTH",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		await interaction.reply("This command is not available yet");

		// if (
		// 	interaction.channel?.type !== ChannelType.PrivateThread &&
		// 	(interaction.channel?.type !== ChannelType.DM ||
		// 		interaction.channel?.partial)
		// ) {
		// 	await interaction.editReply({
		// 		content: "This command can only be used in a thread or a DM",
		// 	});
		// 	return;
		// }

		// const chatBot = await ChatBotManager.getChatBot(interaction.channel);
		// if (!chatBot) {
		// 	await interaction.editReply({
		// 		content: "This channel is not a chat bot",
		// 	});
		// 	return;
		// }

		// const info = await chatBot.getChatBotInfo();
		// const cost =
		// 	info.info.cost !== null ? Number.parseFloat(info.info.cost) : 0;

		// const embed = new EmbedBuilder().setTitle("Chat Info").addFields(
		// 	{
		// 		name: "Chat ID",
		// 		value: info.chat.id.toString(),
		// 	},
		// 	{
		// 		name: "Model",
		// 		value: info.chat.modelId,
		// 	},
		// 	{
		// 		name: "Prompt",
		// 		value: info.chat.promptTemplate,
		// 	},
		// 	{
		// 		name: "Number of Messages",
		// 		value: info.info.count.toString(),
		// 	},
		// 	{
		// 		name: "Number of Memories",
		// 		value: info.numMemories.toString(),
		// 	},
		// 	{
		// 		name: "Cost",
		// 		value: `$${cost.toFixed(5)}`,
		// 	},
		// 	{
		// 		name: "Total Tokens",
		// 		value: info.info.total_tokens?.toString() ?? "0",
		// 	},
		// );

		// await interaction.editReply({ embeds: [embed] });
	}
}
