import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addStringOption({
		name: "query",
		description: "query to search or url to play",
		required: true,
	})
	.build();

export default class Play extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "play",
			description: "Play or search a song",
			options,
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		await interaction.reply("temporarily disabled");
		// await this.echidna.musicPlayer.playCmd(interaction, this.options.query);
	}
}
