import { DiscordEvent } from "@Structures/discord-events";
import type { Message } from "discord.js";

export default class MessageCreate extends DiscordEvent<"messageCreate"> {
	constructor() {
		super({ eventName: "messageCreate", eventType: "on" });
	}

	async run(message: Message) {}
}
