import Anime from "@Structures/anime";

import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import type {
	AutocompleteInteraction,
	CacheType,
	CommandInteraction,
} from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "anime-name",
		description: "Name of the anime you want to search for",
		autocomplete: true,
		required: true,
	})
	.build();

export default class SearchAnimeCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "search-anime",
			description: "Search for an anime",
			cmdType: "BOTH",
			options,
		});
	}

	async handleAutocomplete(
		interaction: AutocompleteInteraction<CacheType>,
	): Promise<void> {
		const focusedValue = interaction.options.getFocused();
		const animeList = await Anime.searchForAnimeByTerm(focusedValue);
		await interaction.respond(
			animeList.map((anime) => ({
				name: anime.title.default,
				value: anime.id.toString(),
			})),
		);
	}

	async run(interaction: CommandInteraction<CacheType>) {
		await interaction.deferReply();

		try {
			const animeID = this.options["anime-name"];

			const anime = await Anime.getAnimeByID(animeID);

			if (!anime) {
				throw new Error("Internal Error");
			}
			const embed = Anime.getAnimeEmbed(anime);

			await interaction.editReply({ embeds: [embed] });
		} catch (error: any) {
			console.error("Error fetching random anime:", error);
			await interaction.editReply(
				"An error occurred while fetching a random anime. Please try again later.",
			);
		}
	}
}
