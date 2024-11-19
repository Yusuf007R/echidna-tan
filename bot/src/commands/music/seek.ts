import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
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

	async run(interaction: CommandInteraction<CacheType>) {
		const seekTime = this.options.time;
		this.player?.node.seek(seekTime);
		await interaction.reply({ content: `Seeked to \`${seekTime}\`` });
	}
}
