import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

export default class Resume extends MusicCommand {
	constructor() {
		super({
			name: "resume",
			description: "Resume the current song.",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		this.player?.node.resume();
		await interaction.reply({ content: "Resumed the current song." });
	}
}
