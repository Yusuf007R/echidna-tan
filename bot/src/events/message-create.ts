import ChatBotManager from "@Managers/chat-bot-manager";
import { UserManager } from "@Managers/user-manager";
import { DiscordEvent } from "@Structures/discord-events";
import { ChannelType, type Message } from "discord.js";

export default class MessageCreate extends DiscordEvent<"messageCreate"> {
	constructor() {
		super({ eventName: "messageCreate", eventType: "on" });
	}

	async run(message: Message) {
		if (message.author.bot) return;

		const user = await UserManager.getOrCreateUser(message.author.id);

		if (!user.isAdmin) return;
		const isDM = message.channel.type === ChannelType.DM;
		const isThread = message.channel.type === ChannelType.PrivateThread;

		if (isDM) {
			if (message.channel.partial) return;
			const chatBot = await ChatBotManager.getOrCreateChatBot(
				message.channel,
				user,
			);
			await chatBot.processMessage(message);
		}

		if (isThread) {
			const chatBot = await ChatBotManager.getOrCreateChatBot(
				message.channel,
				user,
			);
			await chatBot.processMessage(message);
		}
	}
}
