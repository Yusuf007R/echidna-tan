import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
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

	async run(interaction: CommandInteraction<CacheType>) {
		this.player?.node.pause();
		await interaction.reply({ content: "Paused the current song." });
	}
}
