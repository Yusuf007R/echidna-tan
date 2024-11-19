import capitalize from "@Utils/capitalize";
import { OptionsBuilder } from "@Utils/options-builder";
import { QueueRepeatMode } from "discord-player";
import type { CacheType, CommandInteraction } from "discord.js";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addStringOption({
		name: "mode",
		description: "The mode to set the loop to.",
		required: true,
		choices: Object.keys(QueueRepeatMode).map((opt) => capitalize(opt)),
	})
	.build();

export default class LoopCommand extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "loop",
			description: "Set the loop mode of the player.",

			options,
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		const modeOpt = this.options.mode;
		// ts is being weird 💀
		const mode =
			QueueRepeatMode[modeOpt.toUpperCase() as keyof typeof QueueRepeatMode];
		this.player?.setRepeatMode(mode);
		await interaction.reply({ content: `Loop mode set to \`${mode}\`` });
	}
}
