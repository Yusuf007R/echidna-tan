import Anime from "@Structures/anime";
import { Command } from "@Structures/command";
import { InteractionContext } from "@Structures/interaction-context";

export default class RandomAnimeCommand extends Command {
	constructor() {
		super({
			name: "random-anime",
			description: "Get a random anime recommendation",
			cmdType: "BOTH",
		});
	}

	async run() {
		await InteractionContext.deferReply();

		try {
			const anime = await Anime.getRandomAnime();
			const embed = Anime.getAnimeEmbed(anime);

			await InteractionContext.editReply({ embeds: [embed] });
		} catch (error: any) {
			console.error("Error fetching random anime:", error);
			await InteractionContext.editReply(
				"An error occurred while fetching a random anime. Please try again later.",
			);
		}
	}
}
