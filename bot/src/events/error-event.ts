import { DiscordEvent } from "@Structures/discord-events";

export default class ErrorEvent extends DiscordEvent<"error"> {
	constructor() {
		super({ eventName: "error" });
	}

	// biome-ignore lint/suspicious/useAwait: there is nothing to await
	async run(error: Error): Promise<void> {
		console.error("Client error:", error);
	}
}
