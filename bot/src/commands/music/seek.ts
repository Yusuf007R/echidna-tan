import { InteractionContext } from "@Structures/interaction-context";
import { OptionsBuilder } from "@Utils/options-builder";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addIntOption({
		description: "The time to seek to.",
		name: "time",
		required: true,
		min: 0,
	})
	.build();

export default class Seek extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "seek",
			description: "Seek to a specific time in the current song.",

			options,
		});
	}

	async run() {
		const seekTime = this.options.time;
		this.player?.node.seek(seekTime);
		await InteractionContext.sendReply(`Seeked to \`${seekTime}\``);
	}
}
