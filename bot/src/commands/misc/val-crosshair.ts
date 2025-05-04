import { Command } from "@Structures/command";
import ValCrosshair from "@Structures/val-crosshair";
import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "crosshair-code",
		description: "The code of the crosshair to generate",
		required: true,
	})
	.build();

export default class ValCrosshairCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "val-crosshair",
			description: "Generate a image of a crosshair for Valorant",
			options,
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		await interaction.deferReply();
		const crosshairCode = this.options["crosshair-code"];
		return await new ValCrosshair().getCrosshair(interaction, crosshairCode);
	}
}
