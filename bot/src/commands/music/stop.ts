import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

export default class Stop extends MusicCommand {
	constructor() {
		super({
			name: "stop",
			description: "Stop the current song.",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		this.player?.delete();
		await interaction.reply({ content: "Stopped the current song." });
	}
}
