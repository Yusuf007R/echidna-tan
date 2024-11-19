import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

export default class Skip extends MusicCommand {
	constructor() {
		super({
			name: "skip",
			description: "Skip the current song.",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		this.player?.node.skip();
		await interaction.reply({ content: "Skipped the current song." });
	}
}
