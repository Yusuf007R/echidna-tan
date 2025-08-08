import { InteractionContext } from "@Structures/interaction-context";
import { OptionsBuilder } from "@Utils/options-builder";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder().build();

export default class Pause extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "pause",
			description: "Pause the current song.",
			options,
		});
	}

	async run() {
		this.player?.node.pause();
		await InteractionContext.sendReply("Paused the current song.");
	}
}
