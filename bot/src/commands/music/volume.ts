import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addIntOption({
		description: "The volume to set the music player to.",
		name: "volume",
		required: true,
		min: 0,
		max: 100,
	})
	.build();

export default class Volume extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "volume",
			description: "Set the volume of the music player. (0-100)",
			options,
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		const volume = this.options.volume;
		this.player?.node.setVolume(volume);
		await interaction.reply({ content: `Volume set to \`${volume}\`` });
	}
}
