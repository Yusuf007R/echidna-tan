import { InteractionContext } from "@Structures/interaction-context";
import { MusicCommand } from "./[wrapper]";

export default class Resume extends MusicCommand {
	constructor() {
		super({
			name: "resume",
			description: "Resume the current song.",
		});
	}

	async run() {
		this.player?.node.resume();
		await InteractionContext.sendReply("Resumed the current song.");
	}
}
