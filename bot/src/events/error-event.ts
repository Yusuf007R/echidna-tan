import { DiscordEvent } from "@Structures/discord-events";

export default class ErrorEvent extends DiscordEvent<"error"> {
	constructor() {
		super({ eventName: "error" });
	}

	async run(error: Error): Promise<void> {
		console.error("Client error:", error);
	}
}
