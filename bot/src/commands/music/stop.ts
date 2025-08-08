import { InteractionContext } from "@Structures/interaction-context";
import { MusicCommand } from "./[wrapper]";

export default class Stop extends MusicCommand {
	constructor() {
		super({
			name: "stop",
			description: "Stop the current song.",
		});
	}

	async run() {
		if (!this.player) {
			await InteractionContext.sendReply("Nothing currently playing");
			return;
		}
		this.player?.delete();
		await InteractionContext.sendReply("Stopped the current song.");
	}
}
