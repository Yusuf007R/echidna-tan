import { InteractionContext } from "@Structures/interaction-context";
import { MusicCommand } from "./[wrapper]";

export default class Shuffle extends MusicCommand {
	constructor() {
		super({
			name: "shuffle",
			description: "Shuffle the queue.",
		});
	}

	async run() {
		this.player?.toggleShuffle();
		await InteractionContext.sendReply("Shuffled the queue.");
	}
}
