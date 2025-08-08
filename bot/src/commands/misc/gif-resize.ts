import { Command } from "@Structures/command";
import GifResize from "@Structures/gif-resize";
import { OptionsBuilder } from "@Utils/options-builder";
import withInterval from "@Utils/with-interval";
import {
	AttachmentBuilder,
	type CacheType,
	Collection,
	type CommandInteraction,
} from "discord.js";
import { ZodError } from "zod";

const options = new OptionsBuilder()
	.addIntOption({
		name: "width",
		description: "The width of the gif",
		required: true,
		min: 1,
	})
	.addIntOption({
		name: "height",
		description: "The height of the gif",
		min: 1,
	})
	.build();

export default class GifResizeCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "gif-resize",
			description: "Resize a gif",
			options,
			cmdType: "BOTH",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		const gifResized = new GifResize();

		const width = this.options.width;
		const height = this.options.height;

		interaction.reply("Please provide a gif to resize");

		const dmChannel = await interaction.user.createDM();

		try {
			const collected = await dmChannel?.awaitMessages({
				max: 1,
				time: 60000,
				errors: ["time"],
				filter: (m) => m.author.id === interaction.user.id,
			});
			const message = collected.first();
			const stopTyping = withInterval(() => dmChannel.sendTyping());
			if (!message) throw new Error("Internal error, try again later.");

			const gifs = await gifResized.getGifs(message, 0);

			if (!gifs.length) throw new Error("Gif Not Found");

			await Promise.all(
				gifs.map(async (gif) => {
					const gifBuffer = await gifResized.resize(gif, { width, height });

					const file = new AttachmentBuilder(gifBuffer, {
						name: "resized.gif",
					});

					dmChannel.send({ files: [file] });
				}),
			);

			stopTyping();
		} catch (error) {
			if (error instanceof ZodError) {
				throw new Error("Not a valid GIF");
			}

			if (error instanceof Collection) {
				throw new Error("You took too long to send the GIF max 60 seconds");
			}

			throw new Error("Internal error, try again later.");
		}
	}
}
