import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

export default class Shuffle extends MusicCommand {
	constructor() {
		super({
			name: "shuffle",
			description: "Shuffle the queue.",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		this.player?.toggleShuffle();
		await interaction.reply({ content: "Shuffled the queue." });
	}
}
