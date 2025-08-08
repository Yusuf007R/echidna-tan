import { Command } from "@Structures/command";
import { InteractionContext } from "@Structures/interaction-context";

export default class Ping extends Command {
	constructor() {
		super({
			name: "ping",
			description: "Ping the bot",
			cmdType: "GUILD",
			// shouldDefer: true,
		});
	}

	async run(): Promise<void> {
		await InteractionContext.sendReply("Pong!");
	}
}
