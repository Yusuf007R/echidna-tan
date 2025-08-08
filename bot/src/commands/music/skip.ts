import { InteractionContext } from "@Structures/interaction-context";
import { MusicCommand } from "./[wrapper]";

export default class Skip extends MusicCommand {
	constructor() {
		super({
			name: "skip",
			description: "Skip the current song.",
		});
	}

	async run() {
		this.player?.node.skip();
		await InteractionContext.sendReply("Skipped the current song.");
	}
}
